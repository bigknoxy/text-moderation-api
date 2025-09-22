import { createClient, RedisClientType } from 'redis';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Token bucket result returned by consumeToken
 */
export type TokenBucketResult = { allowed: boolean; remaining: number; retryAfterSec?: number };

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// When set, tests and CI can force the code to use the in-memory token bucket
// instead of attempting to contact Redis. This ensures deterministic tests.
// Set to any truthy value to enable the forced in-memory mode.
const FORCE_IN_MEMORY_TOKEN_BUCKET = Boolean(process.env.FORCE_IN_MEMORY_TOKEN_BUCKET);

// Configurable timeout (ms) for Redis calls when attempted. Short default to keep tests fast.
const REDIS_CALL_TIMEOUT_MS = Number(process.env.REDIS_CALL_TIMEOUT_MS || '200');

let client: RedisClientType | null = null;

let LUA_SCRIPT = '';
try {
  const luaPath = path.join(process.cwd(), 'src', 'services', 'auth', 'token_bucket.lua');
  LUA_SCRIPT = readFileSync(luaPath, 'utf8');
} catch (err) {
  LUA_SCRIPT = '';
}

// Allow CI or env to provide a preloaded SHA
let LUA_SHA = process.env.REDIS_LUA_SHA || '';

if (!FORCE_IN_MEMORY_TOKEN_BUCKET) {
  try {
    client = createClient({ url: redisUrl });
    // Connect but don't block — if connection fails we'll just set client to null
    client.connect().catch(() => {
      client = null;
    });
  } catch (err) {
    client = null;
  }
}

// Simple in-memory fallback token buckets per key
type InMemoryBucket = { tokens: number; last: number; capacity: number; refillPerSec: number };
const inMemoryBuckets: Map<string, InMemoryBucket> = new Map();

/**
 * Wraps a promise with a timeout to avoid long blocking Redis operations
 */
async function callWithTimeout<T>(p: Promise<T>, ms = REDIS_CALL_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Redis operation timed out')), ms);
    p.then((res) => {
      clearTimeout(t);
      resolve(res as T);
    }).catch((err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

/**
 * Returns true when Redis client is present and ready to accept commands.
 * Consumers can call this before attempting Redis-backed operations to
 * avoid blocking or attempting commands when Redis is offline.
 */
export function isRedisReady(): boolean {
  if (FORCE_IN_MEMORY_TOKEN_BUCKET) return false;
  return !!client && (client as any).isOpen === true;
}

async function ensureLuaLoaded(): Promise<void> {
  if (!isRedisReady() || !LUA_SCRIPT) return;
  if (LUA_SHA) return;
  try {
    const sha = await callWithTimeout<any>(
      (client as RedisClientType).sendCommand(['SCRIPT', 'LOAD', LUA_SCRIPT] as any)
    );
    LUA_SHA = String(sha);
  } catch (err) {
    // ignore, we'll fallback
  }
}

/**
 * Consume a token for a given key. Uses Redis-backed token bucket when available
 * and falls back to an in-memory bucket otherwise. This function is intentionally
 * defensive so tests and environments without Redis do not hang.
 */
export async function consumeToken(
  key: string,
  capacity = 5,
  refillPerSec = 1,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<TokenBucketResult> {
  // Prefer deterministic in-memory mode when explicitly requested (test mode)
  if (FORCE_IN_MEMORY_TOKEN_BUCKET) {
    return consumeInMemory(key, capacity, refillPerSec, nowSec);
  }

  if (isRedisReady()) {
    await ensureLuaLoaded();

    if (LUA_SHA) {
      try {
        const redisKey = `rb:${key}`;
        const res = await callWithTimeout<any>(
          (client as RedisClientType).sendCommand([
            'EVALSHA',
            LUA_SHA,
            '1',
            redisKey,
            String(capacity),
            String(refillPerSec),
            String(nowSec),
            String(1),
          ] as any)
        );
        const allowed = Number(res[0]) === 1;
        const remaining = Number(res[1] ?? 0);
        const retryAfterSec = res[2] ? Number(res[2]) : undefined;
        return { allowed, remaining: Math.floor(remaining), retryAfterSec };
      } catch (err: unknown) {
        const msg = String(err).toUpperCase();
        if (msg.includes('NOSCRIPT') && LUA_SCRIPT) {
          try {
            const sha = await callWithTimeout<any>(
              (client as RedisClientType).sendCommand(['SCRIPT', 'LOAD', LUA_SCRIPT] as any)
            );
            LUA_SHA = String(sha);
            const redisKey = `rb:${key}`;
            const res = await callWithTimeout<any>(
              (client as RedisClientType).sendCommand([
                'EVALSHA',
                LUA_SHA,
                '1',
                redisKey,
                String(capacity),
                String(refillPerSec),
                String(nowSec),
                String(1),
              ] as any)
            );
            const allowed = Number(res[0]) === 1;
            const remaining = Number(res[1] ?? 0);
            const retryAfterSec = res[2] ? Number(res[2]) : undefined;
            return { allowed, remaining: Math.floor(remaining), retryAfterSec };
          } catch (err2) {
            // fallthrough to Redis hash fallback
          }
        }
        // fallthrough to Redis hash fallback
      }
    }

    // Redis hash fallback
    try {
      const redisKey = `rb:${key}`;
      // hGetAll returns an object of string values or an empty object
      const raw = await callWithTimeout<Record<string, string> | null>(
        (client as RedisClientType).hGetAll(redisKey) as Promise<Record<string, string> | null>
      );
      const tokens = Number(raw?.tokens ?? capacity);
      const last = Number(raw?.last ?? nowSec);
      const delta = Math.max(0, nowSec - last);
      let updatedTokens = Math.min(capacity, tokens + delta * refillPerSec);
      if (updatedTokens >= 1) {
        updatedTokens -= 1;
        await (client as RedisClientType).hSet(redisKey, {
          tokens: String(updatedTokens),
          last: String(nowSec),
        });
        await (client as RedisClientType).expire(redisKey, 3600);
        return { allowed: true, remaining: Math.floor(updatedTokens) };
      }
      const missing = 1 - updatedTokens;
      const retry = Math.ceil(missing / refillPerSec);
      return { allowed: false, remaining: Math.floor(updatedTokens), retryAfterSec: retry };
    } catch (err) {
      // Redis failure: fall through to in-memory
    }
  }

  // Fallback to in-memory if Redis not ready or on errors
  return consumeInMemory(key, capacity, refillPerSec, nowSec);
}

function consumeInMemory(
  key: string,
  capacity: number,
  refillPerSec: number,
  nowSec: number
): TokenBucketResult {
  const b = inMemoryBuckets.get(key) || { tokens: capacity, last: nowSec, capacity, refillPerSec };
  const delta = Math.max(0, nowSec - b.last);
  b.tokens = Math.min(b.capacity, b.tokens + delta * b.refillPerSec);
  b.last = nowSec;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    inMemoryBuckets.set(key, b);
    return { allowed: true, remaining: Math.floor(b.tokens) };
  }
  const missing = 1 - b.tokens;
  const retry = Math.ceil(missing / b.refillPerSec);
  return { allowed: false, remaining: Math.floor(b.tokens), retryAfterSec: retry };
}

export function resetInMemoryBucket(key: string, capacity = 5, refillPerSec = 1) {
  inMemoryBuckets.set(key, {
    tokens: capacity,
    last: Math.floor(Date.now() / 1000),
    capacity,
    refillPerSec,
  });
}

import { createClient } from 'redis';
import { readFileSync } from 'fs';
import path from 'path';

type TokenBucketResult = { allowed: boolean; remaining: number; retryAfterSec?: number };

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let client: any = null;

let LUA_SCRIPT = '';
try {
  const luaPath = path.join(process.cwd(), 'src', 'services', 'auth', 'token_bucket.lua');
  LUA_SCRIPT = readFileSync(luaPath, 'utf8');
} catch (err) {
  LUA_SCRIPT = '';
}

// Allow CI or env to provide a preloaded SHA
let LUA_SHA = process.env.REDIS_LUA_SHA || '';

try {
  client = createClient({ url: redisUrl });
  client.connect().catch(() => {
    client = null;
  });
} catch (err) {
  client = null;
}

// Simple in-memory fallback token buckets per key
const inMemoryBuckets: Map<
  string,
  { tokens: number; last: number; capacity: number; refillPerSec: number }
> = new Map();

async function ensureLuaLoaded(): Promise<void> {
  if (!client || !LUA_SCRIPT) return;
  if (LUA_SHA) return;
  try {
    const sha = await client.sendCommand(['SCRIPT', 'LOAD', LUA_SCRIPT]);
    LUA_SHA = String(sha);
  } catch (err) {
    // ignore, we'll fallback
  }
}

export async function consumeToken(
  key: string,
  capacity = 5,
  refillPerSec = 1,
  nowSec = Math.floor(Date.now() / 1000)
): Promise<TokenBucketResult> {
  if (client) {
    await ensureLuaLoaded();

    if (LUA_SHA) {
      try {
        const redisKey = `rb:${key}`;
        const res: any = await client.sendCommand([
          'EVALSHA',
          LUA_SHA,
          '1',
          redisKey,
          String(capacity),
          String(refillPerSec),
          String(nowSec),
          String(1),
        ]);
        const allowed = Number(res[0]) === 1;
        const remaining = Number(res[1]) || 0;
        const retryAfterSec = res[2] ? Number(res[2]) : undefined;
        return { allowed, remaining: Math.floor(remaining), retryAfterSec };
      } catch (err: any) {
        const msg = String(err).toUpperCase();
        if (msg.includes('NOSCRIPT') && LUA_SCRIPT) {
          try {
            const sha = await client.sendCommand(['SCRIPT', 'LOAD', LUA_SCRIPT]);
            LUA_SHA = String(sha);
            const redisKey = `rb:${key}`;
            const res: any = await client.sendCommand([
              'EVALSHA',
              LUA_SHA,
              '1',
              redisKey,
              String(capacity),
              String(refillPerSec),
              String(nowSec),
              String(1),
            ]);
            const allowed = Number(res[0]) === 1;
            const remaining = Number(res[1]) || 0;
            const retryAfterSec = res[2] ? Number(res[2]) : undefined;
            return { allowed, remaining: Math.floor(remaining), retryAfterSec };
          } catch (err2) {
            // fallthrough
          }
        }
        // fallthrough to Redis hash fallback
      }
    }

    // Redis hash fallback
    try {
      const redisKey = `rb:${key}`;
      const raw = await client.hGetAll(redisKey);
      let tokens = Number(raw.tokens || capacity);
      let last = Number(raw.last || nowSec);
      const delta = Math.max(0, nowSec - last);
      tokens = Math.min(capacity, tokens + delta * refillPerSec);
      if (tokens >= 1) {
        tokens -= 1;
        await client.hSet(redisKey, { tokens: String(tokens), last: String(nowSec) });
        await client.expire(redisKey, 3600);
        return { allowed: true, remaining: Math.floor(tokens) };
      }
      const missing = 1 - tokens;
      const retry = Math.ceil(missing / refillPerSec);
      return { allowed: false, remaining: Math.floor(tokens), retryAfterSec: retry };
    } catch (err) {
      // Redis failure: fall through to in-memory
    }
  }

  // In-memory fallback
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

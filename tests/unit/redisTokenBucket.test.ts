import { describe, it, expect, beforeEach } from 'bun:test';

// Ensure the module uses in-memory fallback deterministically for this test
process.env.FORCE_IN_MEMORY_TOKEN_BUCKET = 'true';

let redisModule: typeof import('../../src/services/auth/redisTokenBucket');

beforeEach(async () => {
  // Clear module cache to ensure env var takes effect when importing
  // Bun's test environment runs each test file in a separate process, but ensure safe import
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  redisModule = await import('../../src/services/auth/redisTokenBucket');
});

describe('redisTokenBucket (in-memory forced)', () => {
  it('uses in-memory fallback when FORCE_IN_MEMORY_TOKEN_BUCKET is set', async () => {
    const key = `unit-test-${Date.now()}`;
    // Reset to ensure deterministic state
    redisModule.resetInMemoryBucket(key, 2, 1);

    // consume two tokens successfully
    const r1 = await redisModule.consumeToken(key, 2, 1, Math.floor(Date.now() / 1000));
    expect(r1.allowed).toBe(true);
    expect(typeof r1.remaining).toBe('number');

    const r2 = await redisModule.consumeToken(key, 2, 1, Math.floor(Date.now() / 1000));
    expect(r2.allowed).toBe(true);

    // third should be denied
    const r3 = await redisModule.consumeToken(key, 2, 1, Math.floor(Date.now() / 1000));
    expect(r3.allowed).toBe(false);

    // health check should report Redis not ready in forced mode
    expect(redisModule.isRedisReady()).toBe(false);
  });
});

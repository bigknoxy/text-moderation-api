import { describe, it, expect } from 'bun:test';
import { resetInMemoryBucket, consumeToken } from '../../src/services/auth/redisTokenBucket';

describe('token-bucket (in-memory fallback)', () => {
  it('allows requests up to capacity and then blocks with retryAfter', async () => {
    const key = 'tb-test-' + Date.now();
    resetInMemoryBucket(key, 3, 1);

    // consume 3
    for (let i = 0; i < 3; i++) {
      const r = await consumeToken(key, 3, 1);
      expect(r.allowed).toBe(true);
    }

    // Next should be blocked
    const r2 = await consumeToken(key, 3, 1);
    expect(r2.allowed).toBe(false);
    expect(typeof r2.retryAfterSec).toBe('number');
  });
});

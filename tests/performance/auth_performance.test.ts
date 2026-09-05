import { describe, it, expect } from 'bun:test';
import { KeyStoreStatic } from '../../src/services/auth/keyStoreStatic';
import { createAuthMiddleware, seedTestKey } from '../../src/services/auth/middleware';

// Simulate high load for auth/rate limiting

describe('Auth Performance', () => {
  it('should enforce rate limit under high load', async () => {
    const ks = new KeyStoreStatic();
    const ak = await ks.createKey({ purpose: 'perf-test' });
    const auth = createAuthMiddleware(ks);
    seedTestKey(ak.secretPlain!);

    let allowed = 0;
    let rateLimited = 0;
    const reqs = [];
    for (let i = 0; i < 50; i++) {
      reqs.push(
        auth(
          new Request('http://localhost/v1/protected/sample', {
            headers: { 'x-api-key': ak.secretPlain! },
          })
        ).then((res) => {
          if (res.allowed) allowed++;
          if (res.status === 429) rateLimited++;
        })
      );
    }
    await Promise.all(reqs);
    expect(allowed).toBeGreaterThan(0);
    expect(rateLimited).toBeGreaterThan(0);
    expect(allowed + rateLimited).toBe(50);
  });

  it('should reject all requests with invalid key', async () => {
    const ks = new KeyStoreStatic();
    const auth = createAuthMiddleware(ks);
    let rejected = 0;
    const reqs = [];
    for (let i = 0; i < 20; i++) {
      reqs.push(
        auth(
          new Request('http://localhost/v1/protected/sample', {
            headers: { 'x-api-key': 'not-a-real-key' },
          })
        ).then((res) => {
          if (!res.allowed && res.status === 401) rejected++;
        })
      );
    }
    await Promise.all(reqs);
    expect(rejected).toBe(20);
  });
});

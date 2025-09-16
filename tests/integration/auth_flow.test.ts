import { describe, it, expect } from 'bun:test';
import path from 'path';
import { KeyStoreStatic } from '../../src/services/auth/keyStoreStatic';
import { createAuthMiddleware, seedTestKey } from '../../src/services/auth/middleware';

describe('Auth integration (in-memory token bucket)', () => {
  it('creates a key, authenticates and enforces quota', async () => {
    const storePath = path.join(process.cwd(), 'data', 'integration_keys.json');
    const ks = new KeyStoreStatic(storePath);
    const ak = await ks.createKey({ purpose: 'integration-test' });
    expect(ak.secretPlain).toBeTruthy();

    // verify the raw secret works
    const ok = await ks.verifyKey(ak.secretPlain!);
    expect(ok).toBe(true);

    const auth = createAuthMiddleware(ks);
    // Seed in-memory bucket so we know starting tokens
    seedTestKey(ak.secretPlain!);

    // Consume up to capacity
    for (let i = 0; i < 5; i++) {
      const req = new Request('http://localhost/v1/protected/sample', {
        headers: { 'x-api-key': ak.secretPlain! },
      });
      const res = await auth(req);
      expect(res.allowed).toBe(true);
    }

    // Next call should be rate limited
    const req = new Request('http://localhost/v1/protected/sample', {
      headers: { 'x-api-key': ak.secretPlain! },
    });
    const res = await auth(req);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(429);
  });
});

import { describe, it, expect } from 'bun:test';
import { KeyStoreInMemory } from '../../src/services/auth/keyStoreInMemory';
import { createAuthMiddleware } from '../../src/services/auth/middleware';

describe('auth middleware', () => {
  it('returns 401 when no key provided', async () => {
    const ks = new KeyStoreInMemory();
    const auth = createAuthMiddleware(ks);
    const req = new Request('http://localhost/v1/protected/sample');
    const res = await auth(req);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(401);
  });

  it('returns 200 when valid key and under quota', async () => {
    const ks = new KeyStoreInMemory();
    const keyObj = await ks.createKey();
    const auth = createAuthMiddleware(ks);
    const req = new Request('http://localhost/v1/protected/sample', {
      headers: { 'x-api-key': keyObj.key },
    });
    const res = await auth(req);
    expect(res.allowed).toBe(true);
  });
});

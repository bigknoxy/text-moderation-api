import { describe, it, expect } from 'bun:test';
import path from 'path';
import fs from 'fs/promises';

describe('audit emission', () => {
  it('writes an audit NDJSON event to AUDIT_LOG_PATH on auth', async () => {
    const tmp = path.join(process.cwd(), 'data', `test_audit_${Date.now()}.log`);
    process.env.AUDIT_LOG_PATH = tmp;

    // ensure data dir exists
    await fs.mkdir(path.dirname(tmp), { recursive: true });
    // ensure clean
    await fs.rm(tmp, { force: true }).catch(() => {});

    const { KeyStoreInMemory } = await import('../../src/services/auth/keyStoreInMemory');
    const { createAuthMiddleware, seedTestKey } = await import(
      '../../src/services/auth/middleware'
    );

    const ks = new KeyStoreInMemory();
    const ak = await ks.createKey();

    // seed in-memory bucket so requests are allowed
    seedTestKey(ak.key);

    const auth = createAuthMiddleware(ks);
    const req = new Request('http://localhost/v1/protected/sample', {
      headers: { 'x-api-key': ak.key },
    });

    const res = await auth(req);
    expect(res.allowed).toBe(true);

    // Wait up to 500ms for async append (poll every 20ms)
    let txt = '';
    for (let i = 0; i < 25; i++) {
      try {
        txt = await fs.readFile(tmp, 'utf-8');
        if (txt.trim().length > 0) break;
      } catch (e) {
        // file not yet written
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(txt.trim().length).toBeGreaterThan(0);

    const first = JSON.parse(txt.trim().split('\n')[0]);
    expect(first.key).toBe(ak.key);
    expect(first.path).toBe('/v1/protected/sample');
    expect(typeof first.allowed).toBe('boolean');
  });
});

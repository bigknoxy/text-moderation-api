import { describe, it, expect } from 'bun:test';
import { KeyStoreInMemory } from '../../src/services/auth/keyStoreInMemory';

describe('KeyStoreInMemory', () => {
  it('creates, lists, verifies and revokes keys', async () => {
    const ks = new KeyStoreInMemory();
    const k = await ks.createKey({ purpose: 'test' });
    expect(k.key).toBeTruthy();
    const list = await ks.listKeys();
    expect(list.length).toBeGreaterThan(0);
    const ok = await ks.verifyKey(k.key);
    expect(ok).toBe(true);
    const revoked = await ks.revokeKey(k.key);
    expect(revoked).toBe(true);
    const ok2 = await ks.verifyKey(k.key);
    expect(ok2).toBe(false);
  });
});

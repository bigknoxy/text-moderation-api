import type { KeyStore } from './keyStore';
import { KeyStoreInMemory } from './keyStoreInMemory';
import { consumeToken, resetInMemoryBucket } from './redisTokenBucket';

export type AuthResult = { allowed: boolean; status?: number; headers?: Record<string, string> };

export function createAuthMiddleware(ks: KeyStore = new KeyStoreInMemory()) {
  // Ensure default bucket for test keys
  return async function authenticate(req: Request): Promise<AuthResult> {
    const authHeader = req.headers.get('authorization') || '';
    let key = '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      key = authHeader.slice(7).trim();
    } else {
      const x = req.headers.get('x-api-key');
      if (x) key = x;
    }
    if (!key) return { allowed: false, status: 401 };

    const ok = await ks.verifyKey(key);
    if (!ok) return { allowed: false, status: 401 };

    // Rate limit
    const rb = await consumeToken(key, 5, 1);
    if (!rb.allowed) {
      const headers: Record<string, string> = { 'Retry-After': String(rb.retryAfterSec || 1) };
      return { allowed: false, status: 429, headers };
    }

    return { allowed: true };
  };
}

export function seedTestKey(key: string) {
  resetInMemoryBucket(key, 5, 1);
}

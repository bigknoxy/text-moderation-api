import type { KeyStore } from './keyStore';
import { KeyStoreInMemory } from './keyStoreInMemory';
import { consumeToken, resetInMemoryBucket } from './redisTokenBucket';
import { AuditLogger, defaultAuditLogger } from '../audit';
import { recordAuthRequest, observeAuthLatency } from '../metrics';

export type AuthResult = { allowed: boolean; status?: number; headers?: Record<string, string> };

export function createAuthMiddleware(
  ks: KeyStore = new KeyStoreInMemory(),
  auditLogger: AuditLogger = defaultAuditLogger
) {
  // Ensure default bucket for test keys
  return async function authenticate(req: Request): Promise<AuthResult> {
    const start = performance.now();
    const authHeader = req.headers.get('authorization') || '';
    let key = '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      key = authHeader.slice(7).trim();
    } else {
      const x = req.headers.get('x-api-key');
      if (x) key = x;
    }
    const path = new URL(req.url).pathname;
    const method = req.method;

    if (!key) {
      void auditLogger.append({
        key: undefined,
        path,
        method,
        allowed: false,
        status: 401,
        timestamp: new Date().toISOString(),
      });
      recordAuthRequest('none', 401);
      observeAuthLatency('none', 401, (performance.now() - start) / 1000);
      return { allowed: false, status: 401 };
    }

    const ok = await ks.verifyKey(key);
    if (!ok) {
      void auditLogger.append({
        key,
        path,
        method,
        allowed: false,
        status: 401,
        timestamp: new Date().toISOString(),
      });
      recordAuthRequest(key, 401);
      observeAuthLatency(key, 401, (performance.now() - start) / 1000);
      return { allowed: false, status: 401 };
    }

    // Rate limit
    const rb = await consumeToken(key, 5, 1);
    if (!rb.allowed) {
      const headers: Record<string, string> = { 'Retry-After': String(rb.retryAfterSec || 1) };
      void auditLogger.append({
        key,
        path,
        method,
        allowed: false,
        status: 429,
        remaining: rb.remaining,
        retryAfterSec: rb.retryAfterSec ?? null,
        timestamp: new Date().toISOString(),
      });
      recordAuthRequest(key, 429);
      observeAuthLatency(key, 429, (performance.now() - start) / 1000);
      return { allowed: false, status: 429, headers };
    }

    void auditLogger.append({
      key,
      path,
      method,
      allowed: true,
      status: 200,
      remaining: rb.remaining,
      timestamp: new Date().toISOString(),
    });
    recordAuthRequest(key, 200);
    observeAuthLatency(key, 200, (performance.now() - start) / 1000);
    return { allowed: true };
  };
}

export function seedTestKey(key: string) {
  resetInMemoryBucket(key, 5, 1);
}

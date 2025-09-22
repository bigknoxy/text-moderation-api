import { describe, it, expect } from 'bun:test';
import path from 'path';
import { KeyStoreStatic } from '../../src/services/auth/keyStoreStatic';
import { createAuthMiddleware, seedTestKey } from '../../src/services/auth/middleware';

import fs from 'fs/promises';

describe('Auth integration (in-memory token bucket)', () => {
  it('creates a key, authenticates and enforces quota, and logs audit/metrics', async () => {
    const storePath = path.join(process.cwd(), 'data', 'integration_keys.json');
    const ks = new KeyStoreStatic(storePath);
    const ak = await ks.createKey({ purpose: 'integration-test' });
    expect(ak.secretPlain).toBeTruthy();

    // Use an in-memory audit logger stub to avoid file I/O timing issues in tests
    const events: any[] = [];
    const auditLogger = {
      append(e: any) {
        // synchronous push so fire-and-forget calls register immediately
        events.push(e);
        return Promise.resolve();
      },
    };

    // verify the raw secret works
    const ok = await ks.verifyKey(ak.secretPlain!);
    expect(ok).toBe(true);

    const auth = createAuthMiddleware(ks, auditLogger as any);
    // Seed in-memory bucket so we know starting tokens
    seedTestKey(ak.secretPlain!);

    // Consume up to capacity (5 allowed)
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
    expect(res.headers).toBeDefined();
    expect(res.headers && res.headers['Retry-After']).toBeDefined();

    // Since we use synchronous in-memory logger, events should be available immediately
    expect(events.length).toBe(6);
    expect(events.filter((e) => e.allowed).length).toBe(5);
    expect(events.filter((e) => e.status === 429).length).toBe(1);
    expect(events[0].key).toBe(ak.secretPlain!);
    expect(events[0].path).toBe('/v1/protected/sample');

    // METRICS CHECK
    const { getMetrics } = await import('../../src/services/metrics');
    const metrics = await getMetrics();
    // Should have auth_requests_total for 200 and 429 for this key
    expect(metrics).toMatch(
      new RegExp(`auth_requests_total\{key="${ak.secretPlain!}",status="200"\} 5`)
    );
    expect(metrics).toMatch(
      new RegExp(`auth_requests_total\{key="${ak.secretPlain!}",status="429"\} 1`)
    );
  });

  it('rejects invalid API key', async () => {
    const storePath = path.join(process.cwd(), 'data', 'integration_keys.json');
    const ks = new KeyStoreStatic(storePath);
    const { AuditLogger } = await import('../../src/services/audit');
    const auditLogger = new AuditLogger(''); // No file for negative test
    const auth = createAuthMiddleware(ks, auditLogger);
    const req = new Request('http://localhost/v1/protected/sample', {
      headers: { 'x-api-key': 'not-a-real-key' },
    });
    const res = await auth(req);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(401);
  });

  it('rejects missing API key', async () => {
    const storePath = path.join(process.cwd(), 'data', 'integration_keys.json');
    const ks = new KeyStoreStatic(storePath);
    const { AuditLogger } = await import('../../src/services/audit');
    const auditLogger = new AuditLogger(''); // No file for negative test
    const auth = createAuthMiddleware(ks, auditLogger);
    const req = new Request('http://localhost/v1/protected/sample');
    const res = await auth(req);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(401);
  });
});

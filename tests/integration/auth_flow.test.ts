// Set audit log path before any imports
const auditPathGlobal = path.join(process.cwd(), 'data', `test_audit_${Date.now()}.log`);
process.env.AUDIT_LOG_PATH = auditPathGlobal;

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

    // Set up unique audit log path
    const auditPath = path.join(process.cwd(), 'data', `test_audit_${Date.now()}.log`);
    process.env.AUDIT_LOG_PATH = auditPath;
    await fs.mkdir(path.dirname(auditPath), { recursive: true });
    await fs.rm(auditPath, { force: true }).catch(() => {});

    // verify the raw secret works
    const ok = await ks.verifyKey(ak.secretPlain!);
    expect(ok).toBe(true);

    const auth = createAuthMiddleware(ks, auditPath);
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

    // Wait for audit log file to exist and have 6 lines
    let lines = [];
    for (let i = 0; i < 20; i++) {
      try {
        const txt = await fs.readFile(auditPath, 'utf-8');
        lines = txt
          .trim()
          .split('\n')
          .map((l) => JSON.parse(l));
        if (lines.length === 6) break;
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 25));
    }
    if (lines.length !== 6) {
      try {
        const debugTxt = await fs.readFile(auditPath, 'utf-8');
        // eslint-disable-next-line no-console
        console.error('AUDIT LOG DEBUG:', auditPath, debugTxt);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('AUDIT LOG FILE NOT FOUND:', auditPath);
      }
    }
    expect(lines.length).toBe(6);
    expect(lines.filter((e) => e.allowed).length).toBe(5);
    expect(lines.filter((e) => e.status === 429).length).toBe(1);
    expect(lines[0].key).toBe(ak.secretPlain!);
    expect(lines[0].path).toBe('/v1/protected/sample');

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
    const auth = createAuthMiddleware(ks);
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
    const auth = createAuthMiddleware(ks);
    const req = new Request('http://localhost/v1/protected/sample');
    const res = await auth(req);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(401);
  });
});

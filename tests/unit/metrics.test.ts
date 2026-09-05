import { describe, it, expect, beforeEach } from 'bun:test';
import { KeyStoreInMemory } from '../../src/services/auth/keyStoreInMemory';
import { createAuthMiddleware, seedTestKey } from '../../src/services/auth/middleware';
import { getMetrics } from '../../src/services/metrics';

function extractMetric(metrics: string, name: string) {
  // Return all lines for the metric (header + samples)
  const lines = metrics.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`# TYPE ${name} `));
  if (start === -1) return '';
  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith('# TYPE') && lines[end].trim() !== '') end++;
  return lines.slice(start, end).join('\n');
}

describe('auth metrics', () => {
  beforeEach(() => {
    // No-op: metrics are global, but each test uses a new key
  });

  it('increments auth_requests_total and latency for allowed', async () => {
    const ks = new KeyStoreInMemory();
    const ak = await ks.createKey();
    seedTestKey(ak.key);
    const auth = createAuthMiddleware(ks);
    const req = new Request('http://localhost/v1/protected/sample', {
      headers: { 'x-api-key': ak.key },
    });
    const res = await auth(req);
    expect(res.allowed).toBe(true);
    const metrics = await getMetrics();
    console.log('METRICS OUTPUT:', metrics);
    const authReqs = extractMetric(metrics, 'auth_requests_total');
    // Print for debug
    console.log('AUTH_REQS:', authReqs);
    expect(authReqs).toContain(`key="${ak.key}"`);
    expect(authReqs).toContain('status="200"');
    const latency = extractMetric(metrics, 'auth_latency_seconds');
    console.log('LATENCY:', latency);
    expect(latency).toContain(`key="${ak.key}"`);
    expect(latency).toContain('status="200"');
  });

  it('increments auth_requests_total for 401 (invalid key)', async () => {
    const ks = new KeyStoreInMemory();
    const auth = createAuthMiddleware(ks);
    const req = new Request('http://localhost/v1/protected/sample', {
      headers: { 'x-api-key': 'badkey' },
    });
    const res = await auth(req);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(401);
    const metrics = await getMetrics();
    const authReqs = extractMetric(metrics, 'auth_requests_total');
    expect(authReqs).toContain('key="badkey"');
    expect(authReqs).toContain('status="401"');
  });

  it('increments auth_requests_total for 401 (missing key)', async () => {
    const ks = new KeyStoreInMemory();
    const auth = createAuthMiddleware(ks);
    const req = new Request('http://localhost/v1/protected/sample');
    const res = await auth(req);
    expect(res.allowed).toBe(false);
    expect(res.status).toBe(401);
    const metrics = await getMetrics();
    const authReqs = extractMetric(metrics, 'auth_requests_total');
    expect(authReqs).toContain('key="none"');
    expect(authReqs).toContain('status="401"');
  });
});

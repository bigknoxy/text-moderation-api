import path from 'path';
import { KeyStoreStatic } from '../src/services/auth/keyStoreStatic';
import { seedTestKey } from '../src/services/auth/middleware';
import { KeyStoreInMemory } from '../src/services/auth/keyStoreInMemory';
import { AuditLogger, defaultAuditLogger } from '../src/services/audit';
import { consumeToken } from '../src/services/auth/redisTokenBucket';

async function instrumentedAuthenticate(req: Request, ks: any, auditLogger: any) {
  console.log('auth: start');
  const start = performance.now();
  const authHeader = req.headers.get('authorization') || '';
  let key = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    key = authHeader.slice(7).trim();
  } else {
    const x = req.headers.get('x-api-key');
    if (x) key = x;
  }
  const pathn = new URL(req.url).pathname;
  const method = req.method;
  console.log('auth: key extracted', key ? 'yes' : 'no');
  if (!key) {
    console.log('auth: no key');
    await auditLogger.append({
      key: undefined,
      path: pathn,
      method,
      allowed: false,
      status: 401,
      timestamp: new Date().toISOString(),
    });
    console.log('auth: audit append done for no key');
    return { allowed: false, status: 401 };
  }

  console.log('auth: verifyKey start');
  const ok = await ks.verifyKey(key);
  console.log('auth: verifyKey result', ok);
  if (!ok) {
    await auditLogger.append({
      key,
      path: pathn,
      method,
      allowed: false,
      status: 401,
      timestamp: new Date().toISOString(),
    });
    return { allowed: false, status: 401 };
  }

  console.log('auth: consumeToken start');
  const rb = await consumeToken(key, 5, 1);
  console.log('auth: consumeToken result', rb);
  if (!rb.allowed) {
    const headers: Record<string, string> = { 'Retry-After': String(rb.retryAfterSec || 1) };
    await auditLogger.append({
      key,
      path: pathn,
      method,
      allowed: false,
      status: 429,
      remaining: rb.remaining,
      retryAfterSec: rb.retryAfterSec ?? null,
      timestamp: new Date().toISOString(),
    });
    return { allowed: false, status: 429, headers };
  }

  await auditLogger.append({
    key,
    path: pathn,
    method,
    allowed: true,
    status: 200,
    remaining: rb.remaining,
    timestamp: new Date().toISOString(),
  });
  console.log('auth: success');
  return { allowed: true };
}

async function run() {
  console.log('debug-instrumented: starting');
  const storePath = path.join(process.cwd(), 'data', 'integration_keys.json');
  const ks = new KeyStoreStatic(storePath);
  const ak = await ks.createKey({ purpose: 'debug' });
  const ok = await ks.verifyKey(ak.secretPlain!);
  const events: any[] = [];
  const auditLogger = {
    append(e: any) {
      console.log('debug-instrumented: audit append called', e && e.allowed, e && e.status);
      events.push(e);
      return Promise.resolve();
    },
  };
  console.log('debug-instrumented: seeding');
  seedTestKey(ak.secretPlain!);
  console.log('debug-instrumented: calling auth');
  const req = new Request('http://localhost/v1/protected/sample', {
    headers: { 'x-api-key': ak.secretPlain! },
  });
  const res = await instrumentedAuthenticate(req, ks, auditLogger as any);
  console.log('debug-instrumented: auth returned', res);
}

run().catch((err) => {
  console.error('debug-instrumented: error', err);
});

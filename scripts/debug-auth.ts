import path from 'path';
import { KeyStoreStatic } from '../src/services/auth/keyStoreStatic';
import { createAuthMiddleware, seedTestKey } from '../src/services/auth/middleware';

async function run() {
  console.log('debug: starting');
  const storePath = path.join(process.cwd(), 'data', 'integration_keys.json');
  const ks = new KeyStoreStatic(storePath);

  console.log('debug: creating key');
  const ak = await ks.createKey({ purpose: 'debug' });
  console.log('debug: createKey done', ak);

  console.log('debug: verifying key');
  const ok = await ks.verifyKey(ak.secretPlain!);
  console.log('debug: verifyKey done', ok);

  const events: any[] = [];
  const auditLogger = {
    append(e: any) {
      console.log('debug: audit append called', e && e.allowed, e && e.status);
      events.push(e);
      return Promise.resolve();
    },
  };

  console.log('debug: creating auth middleware');
  const auth = createAuthMiddleware(ks, auditLogger as any);

  console.log('debug: seeding test key');
  seedTestKey(ak.secretPlain!);

  console.log('debug: beginning requests');
  for (let i = 0; i < 6; i++) {
    console.log('debug: before auth call', i);
    const req = new Request('http://localhost/v1/protected/sample', {
      headers: { 'x-api-key': ak.secretPlain! },
    });
    const res = await auth(req);
    console.log('debug: after auth call', i, res);
  }

  console.log('debug: events', events.length);
}

run().catch((err) => {
  console.error('debug: error', err);
});

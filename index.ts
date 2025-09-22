import { moderate } from './src/api/index';
import { serve } from 'bun';
import { createAuthMiddleware, seedTestKey } from './src/services/auth/middleware';
import { KeyStoreInMemory } from './src/services/auth/keyStoreInMemory';

const ks = new KeyStoreInMemory();
const auth = createAuthMiddleware(ks);

// Seed a known test key for local development if not provided
if (!process.env.TEST_API_KEY) {
  (async () => {
    const k = await ks.createKey({ purpose: 'dev-seed' });
    console.log('Generated TEST_API_KEY (dev):', k.key);
    seedTestKey(k.key);
    process.env.TEST_API_KEY = k.key;
  })();
} else {
  // also seed bucket for provided key
  seedTestKey(process.env.TEST_API_KEY);
}

serve({
  port: 3000,
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    console.log('Incoming request:', req.method, pathname);

    if (req.method === 'POST' && pathname === '/moderate') {
      try {
        const input = (await req.json()) as any;
        if (!input.userId || !input.content) {
          return new Response(JSON.stringify({ error: 'Missing userId or content' }), {
            status: 400,
          });
        }
        if (!input.timestamp) input.timestamp = Date.now();
        const result = await moderate(input as any);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
          status: 500,
        });
      }
    }

    // Protected sample route
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/v1/protected/sample') {
      const authRes = await auth(req);
      if (!authRes.allowed) {
        return new Response(
          JSON.stringify({
            error: authRes.status === 429 ? 'Rate limit exceeded' : 'Unauthorized',
          }),
          {
            status: authRes.status || 401,
            headers: { 'Content-Type': 'application/json', ...(authRes.headers || {}) },
          }
        );
      }
      return new Response(JSON.stringify({ ok: true, message: 'protected sample' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Serve Swagger UI docs
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/docs') {
      try {
        const html = await Bun.file('./public/swagger-ui/index.html').text();
        return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
      } catch (err) {
        console.error('Error serving /docs:', err);
        return new Response('Docs not found', { status: 500 });
      }
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/openapi.yaml') {
      try {
        const yaml = await Bun.file('./public/openapi.yaml').text();
        return new Response(yaml, { status: 200, headers: { 'Content-Type': 'text/yaml' } });
      } catch (err) {
        console.error('Error serving /openapi.yaml:', err);
        return new Response('OpenAPI spec not found', { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log('🚀 Moderation API running on http://localhost:3000');

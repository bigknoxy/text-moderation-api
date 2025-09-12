import { moderate } from './src/api/index';
import { serve } from 'bun';

serve({
  port: 3000,
  fetch: async (req) => {
    const pathname = new URL(req.url).pathname;
    console.log('Incoming request:', req.method, pathname);

    if (req.method === 'POST' && new URL(req.url).pathname === '/moderate') {
      try {
        const input = (await req.json()) as any;
        // Validate input
        if (!input.userId || !input.content) {
          return new Response(JSON.stringify({ error: 'Missing userId or content' }), {
            status: 400,
          });
        }
        // Add timestamp if missing
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
    // Serve OpenAPI spec
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

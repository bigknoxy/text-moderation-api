import { describe, it, expect } from 'bun:test';

const BASE = 'http://localhost:3000';

describe('Docs Endpoints', () => {
  it('/docs should return Swagger UI HTML', async () => {
    const res = await fetch(`${BASE}/docs`);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('SwaggerUIBundle');
  });

  it('/openapi.yaml should return OpenAPI spec', async () => {
    const res = await fetch(`${BASE}/openapi.yaml`);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('openapi: 3.0.3');
  });
});

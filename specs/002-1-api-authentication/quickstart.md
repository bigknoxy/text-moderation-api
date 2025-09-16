# quickstart.md - API Authentication & Rate Limiting (MVP)

This quickstart demonstrates how an operator can create an API key and how a developer uses it to call a protected endpoint.

Prerequisites:

- Redis available and reachable via `REDIS_URL` env var
- Bun installed for running CLI scripts (`bun run cli:key-manager`)

1. Create a new API key (operator):

```bash
# Creates a key; prints JSON with key_id and secret (secret shown once)
bun run cli:key-manager create --quota-profile trial --format json
```

Response:

```json
{
  "key_id": "abc123",
  "secret": "S3cr3tShownOnce"
}
```

Store the `secret` securely; it will not be shown again.

2. Use the key to call a protected endpoint (developer):

```bash
curl -H "x-api-key: S3cr3tShownOnce" http://localhost:3000/v1/protected/sample
```

Expected responses:

- `200` - request accepted within quota
- `401` - missing/invalid key
- `429` - rate limit exceeded (Retry-After header may be present)

3. Revoke a key (operator):

```bash
bun run cli:key-manager revoke abc123
```

The key becomes immediately invalid; subsequent calls return `401`.

Notes:

- For machine automation, use `--format json` on the CLI to receive machine-parseable output.
- CLI will never print the secret after creation; use `list` to view non-secret metadata.

Implementation references (developer):

- KeyStore implementations:
  - `src/services/auth/keyStore.ts`
  - `src/services/auth/keyStoreStatic.ts`
  - `src/services/auth/keyStoreInMemory.ts`

- Redis token-bucket:
  - `src/services/auth/token_bucket.lua`
  - `src/services/auth/redisTokenBucket.ts`

- Middleware:
  - `src/services/auth/middleware.ts` (integrate into `src/api/index.ts`)

- CLI:
  - `cli/key-manager.ts` (Bun-run CLI with `create|list|revoke` and `--format json`)

Run tests (recommended order):

1. Unit tests: `bun test tests/unit` (keyStore, token_bucket, middleware)
2. Contract tests: `bun test tests/contract` (ensure server is running or use test harness)
3. Integration tests (requires Redis): `REDIS_URL=redis://localhost:6379 bun test tests/integration`
4. Performance tests: `bun test tests/performance`

Local development:

- Start Redis for integration testing: `docker compose up -d redis` (or use `docker-compose.test.yml` if provided).
- Run integration tests once Redis is available.

Operator commands (examples):

- Create key: `bun run cli:key-manager create --quota-profile trial --format json`
- Revoke key: `bun run cli:key-manager revoke <key_id>`

Paths & references:

- Spec & plan: `specs/002-1-api-authentication/spec.md` and `specs/002-1-api-authentication/plan.md`
- Contract: `specs/002-1-api-authentication/contracts/openapi.yaml`
- Contract test placeholder: `tests/contract/api_authentication.contract.test.ts`

DEVELOPER GUIDE

This file documents developer-facing behaviors for authentication keys, the Redis Lua token bucket, and test instructions.

One-Time API Key Behavior

- The system issues one-time API keys for certain operations. A valid one-time key can only be used once; after successful consumption the key is invalidated.
- Keys are stored and validated in Redis. The key lifecycle is:
  1. Create key entry in Redis with a TTL and a `used` flag set to `false`.
  2. On consumption, server executes a Redis Lua script that atomically checks `used` flag and TTL, then sets `used=true` and optionally deletes the key.
  3. If the Lua script returns failure (already used or not present), the request is rejected.

Redis Lua Token Bucket

- The token bucket rate limiter uses a Lua script (`src/services/auth/token_bucket.lua`) loaded into Redis on startup or via `scripts/load-redis-lua.sh`.
- Load the Lua script into Redis with:

  ```
  ./scripts/load-redis-lua.sh
  ```

- The script implements an atomic check-and-consume operation to avoid race conditions.

Running Tests

Prerequisites:

- Bun installed: https://bun.sh
- Redis running at `REDIS_URL` (default `redis://localhost:6379`)
- Environment variables in place: create a `.env` file containing:
  - `HF_API_KEY=your_hf_api_key_here`
  - `REDIS_URL=redis://localhost:6379`

Run all tests:

bun test

Notes:

- Integration tests require Redis and may modify data in your Redis instance; use a dedicated test Redis instance when possible.
- If you change the Lua script, reload it with `./scripts/load-redis-lua.sh` before running tests.

CI / PR Guidance

- Run `bun format` and `bun lint` before creating a PR.
- Include test results and mention if you had to adjust Redis or HF_API_KEY settings.

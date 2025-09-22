Redis-backed token bucket (redisTokenBucket)

Overview

This module implements a token-bucket rate limiter used by the authentication middleware. It prefers Redis (atomic Lua script) but falls back gracefully to an in-memory implementation when Redis is unavailable.

Behavior (priority order):

- Redis Lua script (fast, atomic). See src/services/auth/token_bucket.lua
- Redis hash fallback (reads/writes an HSET/HGET pattern if Lua is not available)
- In-memory fallback (deterministic JS implementation used when Redis is down or forced)

New environment variables

- FORCE_IN_MEMORY_TOKEN_BUCKET
  - Description: When set to any truthy value, the module forces use of the in-memory token bucket and skips attempts to contact Redis.
  - Default: off / false
  - Intended usage: unit tests and CI to make token-bucket behavior deterministic and avoid requiring a live Redis instance.
  - Examples:
    - Bash: FORCE_IN_MEMORY_TOKEN_BUCKET=1 bun test
    - PowerShell: $env:FORCE_IN_MEMORY_TOKEN_BUCKET='1'; bun test
    - CMD: set FORCE_IN_MEMORY_TOKEN_BUCKET=1 && bun test

- REDIS_CALL_TIMEOUT_MS
  - Description: Maximum number of milliseconds to wait for Redis-backed operations (Lua load, EVALSHA, hGetAll, etc.) before timing out and falling back to in-memory behavior.
  - Default: 200
  - Purpose: Keep tests and CI fast by not waiting for long Redis timeouts; increase in production if you expect higher Redis latency.
  - Tradeoffs: Lower values make fallback faster but may cause more in-memory fallbacks when Redis is slow. Higher values reduce false fallbacks at the cost of slower failure detection.

Usage in tests / CI

To run tests deterministically without a Redis instance:

Bash:

```bash
FORCE_IN_MEMORY_TOKEN_BUCKET=1 bun test
```

PowerShell:

```powershell
$env:FORCE_IN_MEMORY_TOKEN_BUCKET='1'; bun test
```

Notes for Node/Bun imports in tests:

- Some tests set process.env.FORCE_IN_MEMORY_TOKEN_BUCKET before importing the module to ensure the module's initialization reads the environment variable (see tests/unit/redisTokenBucket.test.ts).

Readiness check (isRedisReady)

The module exports isRedisReady() so callers can check Redis health without performing blocking operations. Example:

```ts
import { isRedisReady } from '../src/services/auth/redisTokenBucket';

if (isRedisReady()) {
  // safe to call Redis-backed token-bucket operations
} else {
  // fall back or skip Redis-dependent flows
}
```

Production recommendations

- Use a real Redis instance for production to get accurate distributed rate limiting.
- Configure REDIS_CALL_TIMEOUT_MS to a value that balances latency detection and tolerance for transient slowdowns (e.g., 200-1000 ms depending on network).
- Use isRedisReady() before bulk Redis operations to reduce spurious blocking/fallback behavior.

Troubleshooting

- ECONNREFUSED or Redis connection errors during tests: set FORCE_IN_MEMORY_TOKEN_BUCKET=1 for unit tests and CI.
- Tests unexpectedly hitting Redis: ensure any env var setting occurs before importing the redisTokenBucket module.

References

- Implementation: src/services/auth/redisTokenBucket.ts
- Lua script: src/services/auth/token_bucket.lua
- Unit test demonstrating forced in-memory mode: tests/unit/redisTokenBucket.test.ts (sets FORCE_IN_MEMORY_TOKEN_BUCKET before import)

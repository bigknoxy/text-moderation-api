# research.md - API Authentication & Rate Limiting

## Decision: Use Redis-backed token-bucket with atomic Lua script

Rationale:

- Redis supports atomic operations and is already present in the environment (as specified). A token-bucket implemented with an atomic Lua script ensures correctness under concurrency and minimizes race conditions.
- Using Redis allows centralized counters across nodes and simplifies reconciliation compared to purely in-memory solutions.

Alternatives considered:

- Using fixed-window counters via INCR/EXPIRE: simpler but prone to edge burstiness and concurrency issues.
- Using in-memory only (no Redis): faster but not safe for distributed deployments; only acceptable as a short-term fallback.

---

## Decision: Default fail-closed with optional operator-configurable in-memory conservative fallback

Rationale:

- The cost model (protecting model inference quotas) favors denying requests during store outages to prevent runaway costs.
- For short outages, an in-memory conservative fallback reduces operator burden while remaining conservative. This must be configurable and logged for reconciliation.

Alternatives considered:

- Default fail-open: unsafe for cost protections.
- Immediate fail-closed with no fallback: safest but more likely to disrupt legitimate traffic during transient outages.

---

## Decision: API key storage hashed at rest in static-file for MVP, pluggable store later

Rationale:

- MVP needs a simple, auditable mechanism that avoids storing plaintext secrets in source control or logs.
- Hashing secrets (e.g., HMAC or bcrypt/argon2) allows verification without storing the secret.
- A pluggable KeyStore interface will allow migrating to a DB or secret manager later.

Alternatives considered:

- Storing secrets in plain environment variables: insecure if mishandled in CI logs.
- Using a DB upfront: heavier operational footprint.

---

## Decision: Admin key-management via Bun-based CLI script (JSON output optional)

Rationale:

- Project constitution enforces Bun-first tools. A Bun-run CLI script provides operators a simple way to create/list/revoke keys without a UI.
- CLI will support `--format json` to enable programmatic consumption and simple admin dashboards later.

Alternatives considered:

- Implementing an HTTP admin API: more surface area and auth to implement; can be added later.

---

## Security & Operational Notes

- Generated API keys MUST be sufficiently random (>=128 bits entropy) and shown once to the operator at creation.
- Secrets MUST never be logged in plaintext. CLI will print secret only once; subsequent listing only shows `key_id` and metadata.
- Revocation must be immediate; key status checked at auth time.
- Store should use a hashed representation (e.g., HMAC-SHA256 with per-key salt) to allow verification without storing raw secret.

---

## Testing/Validation Notes

- Contract tests will assert 401 for missing/invalid keys, 200 for valid keys within quota, 429 for over-quota, and 401 for revoked keys.
- Integration tests should run against an ephemeral Redis instance. If not available, use a Redis docker container in CI or a lightweight in-memory Redis server for tests.
- Performance tests should measure p95 latency overhead with and without middleware under synthetic load.

---

## Implementation Recommendations

- Implement middleware under `src/services/auth` exporting `authenticate` middleware and `rateLimit` middleware (or combined). Middleware should be composable and easy to plug into existing handlers.
- Use a Lua script for token-bucket in Redis; return remaining tokens and retry-after calculation for 429 responses.
- Provide a simple KeyStore interface with two implementations: `static-file-hashed` and `in-memory` for tests.
- Implement reconciliation logs for in-memory fallback to reconcile with Redis when recovered.

---

## Actionable Research Tasks (for Phase 2 /tasks generation)

- Create Lua token-bucket script and tests (unit for script logic with mocked Redis).
- Implement KeyStore interface and static-file-hashed store implementation.
- Implement Bun CLI `cli/key-manager` with create/list/revoke commands and JSON output.
- Implement auth & rate-limiting middleware with structured logs and audit events.
- Add contract tests and integration tests using ephemeral Redis.
- Add performance tests validating NFRs.

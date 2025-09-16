# data-model.md - API Authentication & Rate Limiting

## Entities

### APIKey

- Description: Represents credentials issued to external users.
- Fields:
  - `key_id`: string (opaque UUID or short id) - primary identifier
  - `secret_hash`: string - hashed representation of the secret (e.g., HMAC-SHA256 or bcrypt/argon2)
  - `status`: enum {"active", "revoked"}
  - `created_by`: string (operator identifier)
  - `created_at`: ISO8601 timestamp
  - `quota_profile`: string (reference to RateLimitProfile name)
  - `metadata`: map<string, string> (optional owner/contact info)

Validation Rules:

- `key_id` unique
- `secret_hash` non-null on creation (secret provided once)
- `status` transitions: `active` -> `revoked` (irreversible)

---

### RateLimitProfile

- Description: Named quota describing allowed requests and burst.
- Fields:
  - `name`: string (e.g., "trial", "standard", "premium")
  - `requests`: integer (allowed requests per `window_seconds`)
  - `window_seconds`: integer (window length in seconds, e.g., 60)
  - `burst`: integer (token-bucket max burst)

Validation Rules:

- `requests` > 0
- `window_seconds` > 0
- `burst` >= 0

---

### PerKeyUsage

- Description: Aggregated usage counters for operational visibility.
- Fields:
  - `key_id`: string (references APIKey.key_id)
  - `window_start`: ISO8601 timestamp or epoch second
  - `request_count`: integer
  - `blocked_count`: integer
  - `last_seen`: ISO8601 timestamp

Notes on storage:

- Runtime usage counts will be maintained in Redis using token-bucket state (tokens, last_refill_ts) for enforcement.
- PerKeyUsage aggregates can either be stored/derived from logs or persisted to a lightweight store for queries (MVP: expose via logs/CLI).

---

## Interfaces

### KeyStore (interface)

- `createKey(created_by, quota_profile, metadata) -> { key_id, secret_plain }` (secret shown once)
- `listKeys() -> [ { key_id, status, quota_profile, created_at, metadata } ]` (no secret_plain returned)
- `revokeKey(key_id) -> boolean` (returns true if revoked)
- `verifyKey(secret_plain) -> { key_id, status, quota_profile } | null`

Implementation Notes:

- `static-file-hashed` implementation: store `key_id, secret_hash, status, created_by, created_at, quota_profile, metadata` in a JSON file with permissions restricted. Hash using HMAC-SHA256 with a per-repo salt or argon2 for stronger hashing.
- Tests should use `in-memory` KeyStore to avoid secrets in test fixtures.

## State Transitions

- On create: APIKey.status = `active`; secret shown only once.
- On revoke: APIKey.status = `revoked`; revoke must be immediate and reflected in auth checks.

## Notes

- Ensure secret handling avoids logging raw secrets.
- Provide migration plan to plug in a real data store later (DB or secrets manager).

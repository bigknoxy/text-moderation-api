# Feature Specification: API Authentication & Rate Limiting

**Feature Branch**: `002-1-api-authentication`  
**Created**: 2025-09-15  
**Status**: Draft  
**Input**: User description: "1. API Authentication & Rate Limiting

• Why: Current open endpoint is a production blocker; prevents abuse, quota exhaustion, and model
cost spikes.
• Scope: API key issuance & management (static file/env first → pluggable store later), HMAC
header option (future), per-key rate limiting (token bucket in Redis), 429 responses, basic usage
metrics per key.
• Impact: Enables safe external trials & SaaS-style usage tiers; protects Hugging Face quota.
• Effort: Medium (Redis primitives + middleware + minimal key admin script).
• KPIs: % authenticated calls (target 100%), blocked-abuse attempts, p95 latency impact (<5%
increase), per-key usage dashboards.
• Dependencies: Redis (already present); no new infra required. - the goal is prevent abuse, create trust and be secure"

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

An external developer requests access to the public API. An operator issues a scoped API key via a minimal admin script. The developer includes the key in requests to protected endpoints. The service authenticates the key, enforces per-key quotas, records usage metrics, and returns a clear error (429) when limits are exceeded. Operators can revoke keys and view per-key usage to detect abuse.

### Acceptance Scenarios

1. **Given** no API key or an invalid API key, **When** the client calls a protected endpoint, **Then** the service responds with HTTP 401 Unauthorized and logs the attempt.
2. **Given** a valid API key and usage within configured limits, **When** the client calls a protected endpoint, **Then** the service returns HTTP 200 and increments the per-key usage counters.
3. **Given** a valid API key that has exceeded its rate limit, **When** the client calls a protected endpoint, **Then** the service returns HTTP 429 Too Many Requests, increments the key's blocked-attempts metric, and (optionally) returns a `Retry-After` indicator.
4. **Given** an operator has revoked an API key, **When** the revoked key is used, **Then** the service rejects the call with HTTP 401 and records the event in the audit log.
5. **Given** the admin operator runs the key-management script, **When** they issue a new key, **Then** the script returns the new secret once (secret not stored in plain logs) and the key becomes usable immediately.

### Edge Cases

- Redis (rate-limiter store) becomes unavailable: Default behaviour is to _fail-closed_ (deny new requests) to protect model quota and prevent runaway costs. To reduce operator impact for short/transient Redis outages, the service will support an _optional, operator-configurable in-memory conservative fallback_ (default grace window: 30 seconds) that enforces strict, per-node limits (configurable, recommended default 10 requests/min per key with a small burst). All fallback events MUST be logged and reconciled once Redis is available. Operators MAY configure an allowlist of internal/trusted keys that bypass rate limiting during outages.
- Extremely high burst traffic from a single key (concurrent requests): ensure rate limiter handles concurrency and atomicity.
- Clock skew between nodes when using distributed rate counters—ensure counters use a single authoritative store.
- Key compromise or leakage: operator must be able to immediately revoke affected keys and have rotation procedure.
- Admin script access control and secrets handling must be documented and secured.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST require a valid API key for all external/protected endpoints. Requests without a valid key MUST be rejected with HTTP 401.
- **FR-002**: The system MUST accept API keys provided via request headers (e.g., `Authorization: Bearer <key>` or `x-api-key`). Support for HMAC header-based authentication is a flagged future enhancement and not required for MVP.
- **FR-003**: The system MUST provide a minimal operator-facing key-management tool (CLI/script) to issue, list, and revoke API keys. Initial storage mechanism: configurable static file or environment (MVP). The design MUST allow swapping to a pluggable key store later.
- **FR-004**: The system MUST apply per-key rate limiting. Each API key MUST have an associated quota (configurable per-key or global default). When a key exceeds its quota the endpoint MUST return HTTP 429 and the event MUST be recorded as a blocked-abuse attempt.
- **FR-005**: The system MUST record basic per-key usage metrics (at minimum: total requests, requests per configured window, blocked attempts, last-seen timestamp) and make them queryable by operators (via the admin script or logs).
- **FR-006**: The system MUST avoid logging full API key secrets. Keys MUST be treated as secrets in transit and at rest (see Security requirements).
- **FR-007**: The system MUST emit audit events for key creation, revocation, authentication failures, and rate-limit blocks.

### Non-functional Requirements

- **NFR-001** (Latency): The added authentication + rate-limiter logic MUST not increase p95 request latency by more than 5% under normal traffic.
- **NFR-002** (Resilience): The system MUST define and implement a safe default behaviour for Redis unavailability: **default = fail-closed** (deny requests) to protect model quotas and costs. The system MUST also provide an _optional in-memory conservative fallback_ (operator-configurable, default grace window 30s) which enforces strict per-node limits (recommended conservative default: 10 requests/min per key with a small burst) and logs all events for reconciliation. The fallback behaviour and window MUST be configurable; operators MUST be alerted when Redis is unavailable and when fallback mode is active. Operators MUST be able to explicitly override to fail-open if availability requirements demand it.
- **NFR-003** (Scalability): The rate-limiting approach MUST scale to the expected production traffic using the existing Redis instance without provisioning additional infra.
- **NFR-004** (Security): API keys MUST be generated with sufficient entropy, secrets presented only once on issuance, and storage of secrets MUST follow least-privilege and non-plaintext practices. Keys SHOULD be stored hashed at rest (MVP: hashed in the static file) so the service can verify tokens without retaining plain secrets.

### Configuration Defaults (MVP)

- Use a token-bucket rate limiter backed by Redis (atomic operations) with a per-key `quota_profile` reference. Examples of recommended profiles (operator-configurable):
  - **trial (conservative default)**: `60 requests / minute` (1 rps), burst `20`
  - **standard**: `600 requests / minute` (10 rps), burst `100`
  - **premium**: `3600 requests / minute` (60 rps), burst `600`
- **Global default profile**: `trial` (60 req/min, burst 20). Keys may be assigned a different profile at creation.
- When returning HTTP 429, the service SHOULD include a `Retry-After` header with the estimated seconds until the next token is available (calculated from token-bucket state).

### Success Criteria (testable)

- Authenticated-call percentage reaches target (100% for protected endpoints).
- Rate-limited calls consistently return HTTP 429 and increment blocked-attempts metrics.
- p95 latency overhead measured in synthetic load tests remains <5% compared to baseline.
- Operators can successfully issue, list, and revoke keys using the provided script; revocation takes effect immediately.

## Key Entities _(include if feature involves data)_

- **APIKey**: Represents a credential issued to an external user.
  - Attributes (business level): `key_id` (opaque identifier), `status` (active/revoked), `created_by`, `created_at`, `quota_profile` (reference to rate limits), `metadata` (optional owner/contact)
- **RateLimitProfile**: Named quota describing `requests` and `window` (e.g., X requests per Y seconds) and optional `burst` allowance.
- **PerKeyUsage**: Aggregated counters for a key (rolling-window or fixed-window): `window_start`, `request_count`, `blocked_count`, `last_seen`

---

## Dependencies & Assumptions

- **Redis**: Present in the environment and available for use as the rate-limiter backing store (stated in feature input). No additional infra provisioning is expected for MVP.
- **Operator access**: Operators have CLI access to run the minimal key-management script.
- **No immediate UI**: Key management is via script/CLI in MVP; an admin UI may be added later.
- **Security posture**: Secrets must not be checked into source control. Implementation must avoid printing secrets in CI logs.

## KPIs

- **% authenticated calls**: Target 100% for protected endpoints.
- **Blocked abuse attempts**: Track and reduce over time; report counts per key.
- **p95 latency impact**: Keep <5% increase.
- **Per-key dashboards**: Basic per-key metrics available to operators (MVP via CLI/querying logs).

## Review & Acceptance Checklist

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs) — _Note: this spec includes implementation constraints (Redis, static-file key store) derived from input; keep them scoped under Dependencies/Assumptions._
- [x] Focused on user value and WHY
- [x] Written for business stakeholders and operators
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous where specified
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (MVP: static-file/env key store; pluggable store later)
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

_Notes & Next Steps_

- Default fallback behaviour when Redis is unavailable: **fail-closed** with optional short in-memory conservative fallback (30s). Operators may override to fail-open, and an allowlist for trusted keys is available.
- Default rate-limit profiles provided above (trial/standard/premium). Operators should review and adjust to expected traffic patterns.
- After approvals, move to planning phase: break down implementation tasks (middleware, Redis primitives, admin script, tests, metrics and dashboards) and estimate effort.

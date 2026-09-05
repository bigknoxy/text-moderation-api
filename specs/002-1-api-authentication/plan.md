# Implementation Plan: API Authentication & Rate Limiting

**Branch**: `002-1-api-authentication` | **Date**: 2025-09-15 | **Spec**: /root/code/text_moderation/text_moderation/specs/002-1-api-authentication/spec.md
**Input**: Feature specification from `/root/code/text_moderation/text_moderation/specs/002-1-api-authentication/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This plan implements API authentication and per-key rate limiting for protected endpoints. It enforces API key verification, per-key token-bucket quotas backed by Redis, a minimal operator key-management CLI (initially using a hashed static-file store or env-configured secrets), audit logging, and per-key usage metrics. The approach favors simplicity, security, and testability to align with the project constitution (Bun-first, Test-First TDD).

## Technical Context

**Language/Version**: Bun (TypeScript) primary runtime; repository uses TypeScript with Bun tooling (NEEDS_CLARIFICATION: exact Bun version used in CI).  
**Primary Dependencies**: Existing project stack (TypeScript, Bun). Redis for rate-limiter backing store. Testing: Bun's test runner / node-compatible test runner (NEEDS_CLARIFICATION: preferred test framework; repo uses tests under `tests/` with Bun-compatible tooling).  
**Storage**: Minimal hashed static-file key store for MVP; pluggable key-store interface to swap later (e.g., DB).  
**Testing**: Contract tests for OpenAPI, integration tests in `tests/integration/`, unit tests in `tests/unit/`. TDD enforced (write failing tests first).  
**Target Platform**: Linux server.  
**Project Type**: Backend API (Option 1: Single project structure under `src/`).  
**Performance Goals**: p95 latency overhead <5% for auth+rate-limit checks.  
**Constraints**: Use Redis atomics (Lua scripts preferred) for token-bucket correctness; fail-closed default with configurable in-memory fallback.  
**Scale/Scope**: Expected to protect external trial keys and support per-key metrics for operational visibility; must scale via existing Redis instance.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**:

- Projects: 2 (api, tests) — PASS
- Using framework directly: YES — PASS
- Single data model for keys and usage: YES — PASS
- Avoiding complex patterns: Repository/UoW avoided — PASS

**Architecture**:

- Feature implemented as library under `src/services/auth` with exported middleware to reuse — PASS
- Libraries listed: `auth-service` (middleware+store), `cli/key-manager` (CLI script), `tests/contract` — PASS
- CLI per library: `bun run cli:key-manager --help` planned — PASS

**Testing (NON-NEGOTIABLE)**:

- RED-GREEN-Refactor enforced — PASS (TBD in tasks)
- Order: Contract→Integration→Unit to be followed — PASS
- Real dependencies: Redis used in integration tests (or test double via ephemeral Redis) — PASS (requires test infra)

**Observability**:

- Structured logging included in middleware — PASS
- Audit events emitted for create/revoke/auth-failure/limit-block — PASS

**Versioning**:

- No breaking changes expected; minor feature bump planned — PASS

## Project Structure

(see template; default Option 1)

## Phase 0: Outline & Research (executed)

1. Extract unknowns from Technical Context:
   - Exact Bun version in CI (NEEDS_CLARIFICATION)
   - Preferred test runner (Bun test runner vs Node jest) (NEEDS_CLARIFICATION)
   - Operator UX expectations for CLI output (machine-parseable JSON vs human) (NEEDS_CLARIFICATION)

2. Research tasks performed (summarized in research.md):
   - Token-bucket implementations with Redis and atomic Lua scripts
   - In-memory fallback strategies and reconciliation approaches
   - Security practices for API key generation, hashing, and rotation

3. Consolidated findings in `research.md`.

**Output**: /root/code/text_moderation/text_moderation/specs/002-1-api-authentication/research.md

## Phase 1: Design & Contracts (executed)

1. Extracted entities → `data-model.md` created with APIKey, RateLimitProfile, PerKeyUsage models.
2. Generated API contracts (OpenAPI) to `/contracts/openapi.yaml` covering:
   - Key management endpoints (admin CLI has parity via script; API endpoints may be added later)
   - Protected sample endpoint contract demonstrating auth + 429 behavior
3. Generated contract tests placeholders under `tests/contract/` that assert schema and HTTP codes (failing tests expected).
4. Extracted test scenarios and created `quickstart.md` explaining how to run the admin script, issue a key, and call a protected endpoint.

**Output**:

- /root/code/text_moderation/text_moderation/specs/002-1-api-authentication/data-model.md
- /root/code/text_moderation/text_moderation/specs/002-1-api-authentication/contracts/openapi.yaml
- /root/code/text_moderation/text_moderation/specs/002-1-api-authentication/quickstart.md
- Contract test placeholders: /root/code/text_moderation/text_moderation/tests/contract/api_authentication.contract.test.ts

## Phase 2: Task Planning Approach (DESCRIBE ONLY)

- The `/tasks` command will load `templates/tasks-template.md` and generate an ordered list of tasks (25-30) following TDD order.
- Priority tasks (P): Contract tests, model creation, middleware implementation, CLI script, integration tests, metrics/instrumentation, performance tests.

### Implementation references (explicit)

To make Phase 3 implementation straightforward, the following file paths and test locations are the canonical places to implement each piece. Follow TDD order: write failing tests first (contract → integration → unit), then implement to make them pass.

- KeyStore interface and implementations:
  - `src/services/auth/keyStore.ts` — `KeyStore` TypeScript interface
  - `src/services/auth/keyStoreStatic.ts` — static-file-hashed KeyStore (MVP)
  - `src/services/auth/keyStoreInMemory.ts` — in-memory KeyStore for tests
  - Tests: `tests/unit/keyStore.test.ts`

- Redis token-bucket:
  - `src/services/auth/token_bucket.lua` — Redis Lua script (atomic token-bucket)
  - `src/services/auth/redisTokenBucket.ts` — loader/wrapper returning `{allowed:boolean, remaining:number, retryAfterSec?:number}`
  - Tests: `tests/unit/token_bucket.test.ts`

- Middleware & integration:
  - `src/services/auth/middleware.ts` — composable middleware exporting `authenticate` and `rateLimit` (or combined)
  - Integrate into `src/api/index.ts` to protect `/v1/protected/*` routes
  - Tests: `tests/integration/auth_flow.test.ts`, `tests/unit/middleware.test.ts`

- Admin CLI:
  - `cli/key-manager.ts` — Bun-run CLI with `create|list|revoke` and `--format json`
  - Tests: `tests/cli/key-manager.test.ts`

- Contract tests & OpenAPI:
  - `tests/contract/api_authentication.contract.test.ts` — implement contract tests asserting 401/200/429/401
  - Update `specs/002-1-api-authentication/contracts/openapi.yaml` if API surface changes

- Test harness & CI:
  - `docker-compose.test.yml` or a test helper script to start ephemeral Redis for integration tests
  - CI job should run contract tests, then integration tests against ephemeral Redis, then performance tests

- Performance tests:
  - `tests/performance/auth_performance.test.ts`

- Sequencing (TDD recommended):
  1. Implement failing contract tests (assert behavior against a running server or test harness).
  2. Implement `KeyStore` (in-memory) and unit tests to allow tests to operate without secrets.
  3. Implement Lua token-bucket and unit tests with mocked Redis (or use ephemeral Redis for integration).
  4. Implement middleware; iterate until contract tests pass.
  5. Implement static-file KeyStore and CLI; add tests for secret handling and revoke behavior.
  6. Add integration tests using ephemeral Redis (docker-compose test).
  7. Run performance tests and tune.

- Existing placeholders:
  - Contract test placeholder: `tests/contract/api_authentication.contract.test.ts`
  - Quickstart: `specs/002-1-api-authentication/quickstart.md`

This explicit mapping will be used by `/tasks` to produce the detailed `tasks.md` and will guide implementers during Phase 3.

## Complexity Tracking

- No constitution violations requiring justification detected.

## Progress Tracking

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning described (stopped at planning) (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---

_Based on Constitution v2.1.1 - See `/root/code/text_moderation/text_moderation/.specify/memory/constitution.md`_

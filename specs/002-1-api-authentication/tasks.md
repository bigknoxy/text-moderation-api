# Tasks: API Authentication & Rate Limiting

**Input**: Design documents from `/specs/002-1-api-authentication/`
**Prerequisites**: `plan.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Execution Flow (main)

1. Validate prerequisites (done via `.specify/scripts/check-task-prerequisites.sh`).
2. Generate tasks following TDD order: Contract tests → Integration tests → Unit tests → Implementation.
3. Number tasks sequentially (T001...); mark parallelizable tasks with `[P]` when they operate on different files.

## Phase 3.1: Setup

- [x] T001 Create `src/services/auth/` directory and initial index files
- [ ] T002 [P] Add dependencies & dev-dependencies if missing (Redis client, argon2 or crypto libs for hashing) - update `package.json`
- [ ] T003 Configure linting and formatting tools if not present (ESLint/Prettier)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation

- [x] T004 [P] Contract test: `tests/contract/api_authentication.contract.test.ts` — assert 401/200/429/401 behavior against `/v1/protected/sample` and admin endpoints (create/revoke). Include `Retry-After` assertion for 429.
- [ ] T005 [P] Integration test: `tests/integration/auth_flow.test.ts` — end-to-end flow: issue key via CLI or KeyStore in-memory, call protected endpoint within quota (200), exceed quota (429), revoke key (401).
- [x] T006 [P] Unit test: `tests/unit/keyStore.test.ts` — KeyStore in-memory behavior (create, list, revoke, verify) should be defined and failing.
- [x] T007 [P] Unit test: `tests/unit/token_bucket.test.ts` — token-bucket logic (Lua or wrapper) behavior tests (consume, refill, retryAfter calculation) failing.
- [x] T008 Unit test: `tests/unit/middleware.test.ts` — middleware should call KeyStore and token-bucket and emit audit events; write tests first that expect middleware to call next or return 401/429.

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [x] T009 [P] `src/services/auth/keyStore.ts` — Define `KeyStore` interface (createKey, listKeys, revokeKey, verifyKey).
- [x] T010 [P] `src/services/auth/keyStoreInMemory.ts` — In-memory KeyStore implementation for tests.
- [ ] T011 `src/services/auth/keyStoreStatic.ts` — Static-file-hashed KeyStore implementation (MVP). Use argon2 or HMAC-SHA256 with repo salt.
- [x] T012 `src/services/auth/token_bucket.lua` — Implement Redis Lua atomic token-bucket script and include header comments documenting inputs/outputs.
- [x] T013 `src/services/auth/redisTokenBucket.ts` — Loader/wrapper that calls the Lua script and returns a typed result: `{allowed:boolean, remaining:number, retryAfterSec?:number}`.
- [x] T014 `src/services/auth/middleware.ts` — Implement `authenticate` and `rateLimit` middleware functions that compose KeyStore + redisTokenBucket, emit audit logs and metrics.
- [x] T015 Integrate middleware into `src/api/index.ts` to protect `/v1/protected/*` routes (use `x-api-key` header parsing and `Authorization: Bearer` support).
- [ ] T016 `cli/key-manager.ts` — Bun-run CLI script: `create|list|revoke` with `--format json` option (use `keyStoreStatic` by default); ensure secrets printed once.

## Phase 3.4: Integration

- [ ] T017 [P] Integration test wiring: configure tests to start ephemeral Redis (docker compose or local fixture) and point `REDIS_URL` at it for `tests/integration/auth_flow.test.ts`.
- [ ] T018 Persist audit events and per-key usage (log structure) — ensure middleware emits structured logs to `src/services/logging.ts`.
- [ ] T019 Add metrics hooks in `src/services/metrics.ts` for per-key requests, blocked attempts, and latency.

## Phase 3.5: Polish

- [ ] T020 [P] Unit tests for CLI (`tests/cli/key-manager.test.ts`) verifying JSON output and secret handling.
- [ ] T021 Performance tests: `tests/performance/auth_performance.test.ts` — validate p95 overhead <5% under synthetic load.
- [ ] T022 [P] Update docs: `specs/002-1-api-authentication/quickstart.md`, `specs/002-1-api-authentication/contracts/openapi.yaml` (if endpoints change).
- [ ] T023 Remove duplication and refactor for DI to allow injecting KeyStore and token-bucket for easier testing.
- [ ] T024 Add `docker-compose.test.yml` and CI job instructions for running integration tests with ephemeral Redis.

## Dependencies

- Tests (T004-T008) must be present before implementation tasks (T009-T016).
- `KeyStoreInMemory` (T010) needed by integration tests (T005).
- Token-bucket (T012/T013) required for middleware (T014) and integration tests (T017).
- CLI (T016) depends on `keyStoreStatic` (T011).

## Parallel Execution Guidance

- Marked `[P]` tasks may run in parallel when they affect different files. For example, T004-T008 (tests) can be created in parallel; T009-T011 (KeyStore files) can be worked on in parallel if developers coordinate.

## Validation Checklist (GATE)

- [ ] All contract files in `specs/002-1-api-authentication/contracts/` have a corresponding contract test task.
- [ ] Each data-model entity has a `src/models` or `src/services` task.
- [ ] Tests exist before implementation tasks they validate.
- [ ] Each task lists an exact file path to create or edit.

---

Generated by `.specify/templates/tasks-template.md` and `specs/002-1-api-authentication/plan.md`

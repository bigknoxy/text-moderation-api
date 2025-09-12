# Tasks: AI-Powered Text Moderation Platform

**Input**: Design documents from `/root/code/text_moderation/text_moderation/specs/001-1-ai-powered/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
2. Load optional design documents: data-model.md, contracts/, research.md, quickstart.md
3. Generate tasks by category: setup, tests, core, integration, polish
4. Apply task rules: parallel/sequential, TDD, dependencies
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness
9. Return: SUCCESS (tasks ready for execution)
```

## Phase 3.1: Setup

- [x] T001 Create project structure per plan.md in /root/code/text_moderation/text_moderation/src/ and /root/code/text_moderation/text_moderation/tests/
- [x] T002 Initialize Bun/TypeScript project and install dependencies (Bun, Elysia/Express, Hugging Face Transformers, Redis, Docker, Prometheus) in /root/code/text_moderation/text_moderation/
- [x] T003 [P] Configure linting and formatting tools (e.g., bun lint, prettier) in /root/code/text_moderation/text_moderation/

## Phase 3.2: Tests First (TDD)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T004 [P] Write contract test for POST /moderate in /root/code/text_moderation/text_moderation/specs/001-1-ai-powered/contracts/moderate.contract.test.ts
- [x] T005 [P] Write integration test for moderation flow (user submits content, receives moderation result) in /root/code/text_moderation/text_moderation/tests/integration/moderation_flow.test.ts

> **Note:** These tests may fail due to external API latency. Adjust timeouts as needed for Hugging Face API speed.

## Phase 3.3: Core Implementation

- [x] T006 [P] Implement UserContent model in /root/code/text_moderation/text_moderation/src/models/userContent.ts (see data-model.md)
- [x] T007 [P] Implement ModerationFlag model in /root/code/text_moderation/text_moderation/src/models/moderationFlag.ts (see data-model.md)
- [x] T008 [P] Implement ModeratorAction model in /root/code/text_moderation/text_moderation/src/models/moderatorAction.ts (see data-model.md)
- [x] T009 [P] Implement AuditLog model in /root/code/text_moderation/text_moderation/src/models/auditLog.ts (see data-model.md)
- [x] T010 Implement moderation service logic in /root/code/text_moderation/text_moderation/src/services/moderation.ts (integrate Hugging Face model, see research.md)
- [x] T011 Implement queueing with Redis Streams in /root/code/text_moderation/text_moderation/src/services/queue.ts (see research.md)
- [x] T012 Implement POST /moderate endpoint in /root/code/text_moderation/text_moderation/src/api/index.ts (see openapi.yaml)

## Phase 3.4: Integration

- [x] T013 Implement minimal logging in /root/code/text_moderation/text_moderation/src/services/logging.ts (see research.md)
- [x] T014 Integrate Prometheus metrics in /root/code/text_moderation/text_moderation/src/services/metrics.ts
- [x] T015 Containerize service with Docker in /root/code/text_moderation/text_moderation/Dockerfile and docker-compose.yml
- [x] T016 Add setup and validation steps to quickstart.md

> **Note:** The correct Docker command is `docker compose`, not `docker-compose`.

## Phase 3.5: Polish

- [x] T017 [P] Write unit tests for models in /root/code/text_moderation/text_moderation/tests/unit/
- [x] T018 [P] Write performance tests for moderation endpoint in /root/code/text_moderation/text_moderation/tests/performance/moderation_performance.test.ts
- [x] T019 [P] Update API documentation in /root/code/text_moderation/text_moderation/specs/001-1-ai-powered/contracts/openapi.yaml and /root/code/text_moderation/text_moderation/specs/001-1-ai-powered/quickstart.md
- [x] T020 Remove duplication and refactor codebase
- [x] T021 Run manual validation and update quickstart.md

> **Note:** Performance and contract tests may fail due to external API latency. Adjust timeouts as needed for Hugging Face API speed.

## Dependencies

- T004, T005 before T006-T012 (TDD)
- T006-T009 can run in parallel ([P])
- T010-T012 depend on models and service logic
- T013-T015 depend on core implementation
- T017-T019 can run in parallel ([P])
- T020, T021 are final polish

## Parallel Example

```
# Launch T004, T005 together:
Task: "Write contract test for POST /moderate in contracts/moderate.contract.test.ts"
Task: "Write integration test for moderation flow in tests/integration/moderation_flow.test.ts"

# Launch T006-T009 together:
Task: "Implement UserContent model in src/models/userContent.ts"
Task: "Implement ModerationFlag model in src/models/moderationFlag.ts"
Task: "Implement ModeratorAction model in src/models/moderatorAction.ts"
Task: "Implement AuditLog model in src/models/auditLog.ts"

# Launch T017-T019 together:
Task: "Write unit tests for models in tests/unit/"
Task: "Write performance tests for moderation endpoint in tests/performance/moderation_performance.test.ts"
Task: "Update API documentation in contracts/openapi.yaml and quickstart.md"
```

## Validation Checklist

- [x] All contracts have corresponding tests
- [x] All entities have model tasks
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

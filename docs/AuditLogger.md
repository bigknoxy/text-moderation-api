AuditLogger

Purpose

- Provide injectable, testable audit logging for authentication and moderation events.

Pattern

- Use the `AuditLogger` class from `src/services/audit.ts`.
- Construct an `AuditLogger` with a file path where NDJSON audit events should be appended.
- Inject the `AuditLogger` instance into services that need to emit audit events. Services should accept a logger parameter and default to the `defaultAuditLogger` exported by the module for production.

Example

- Create a per-test logger in tests:

  const auditLogger = new AuditLogger(tmpPath);
  const auth = createAuthMiddleware(keyStore, auditLogger);

- Production usage:

  // `defaultAuditLogger` reads path from `process.env.AUDIT_LOG_PATH` and is exported for convenience
  const auth = createAuthMiddleware(keyStore);

Notes

- The logger is intentionally tolerant: if no file path is provided, append calls are no-ops. This simplifies negative tests and environments where audit recording is optional.
- Tests should avoid mutating `process.env.AUDIT_LOG_PATH` and instead construct a temporary `AuditLogger` for isolation.

Follow-up

- Migrate remaining modules that previously used a global `appendAudit` helper to accept `AuditLogger` injection.
- Add any operational guidance for rotating or archiving audit files if needed.

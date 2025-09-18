import fs from 'fs/promises';

export type AuditEvent = {
  key?: string;
  path?: string;
  method?: string;
  allowed: boolean;
  status?: number;
  remaining?: number;
  retryAfterSec?: number | null;
  timestamp: string;
};

const AUDIT_PATH = process.env.AUDIT_LOG_PATH || '';

export async function appendAudit(event: AuditEvent, pathOverride?: string): Promise<void> {
  const path = pathOverride || AUDIT_PATH;
  if (!path) return;
  const line = JSON.stringify(event) + '\n';
  // Fire-and-forget append; ensure we don't throw to callers
  try {
    await fs.appendFile(path, line, { encoding: 'utf-8' });
  } catch (err) {
    // ignore errors during audit append
  }
}

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

export async function appendAudit(event: AuditEvent): Promise<void> {
  if (!AUDIT_PATH) return;
  const line = JSON.stringify(event) + '\n';
  // Fire-and-forget append; ensure we don't throw to callers
  try {
    await fs.appendFile(AUDIT_PATH, line, { encoding: 'utf-8' });
  } catch (err) {
    // ignore errors during audit append
  }
}

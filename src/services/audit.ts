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

export class AuditLogger {
  private filePath: string;
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async append(event: AuditEvent): Promise<void> {
    if (!this.filePath) return;
    const line = JSON.stringify(event) + '\n';
    try {
      // DEBUG: log audit append
      // eslint-disable-next-line no-console
      console.log('AuditLogger.append called with path:', this.filePath, 'event:', event);
      await fs.appendFile(this.filePath, line, { encoding: 'utf-8' });
    } catch (err) {
      // ignore errors during audit append
    }
  }
}

// Default instance for production use
const defaultAuditLogger = new AuditLogger(process.env.AUDIT_LOG_PATH || '');
export { defaultAuditLogger };

// Compatibility wrapper for callers that previously imported a global appendAudit helper
export async function appendAudit(event: AuditEvent): Promise<void> {
  return defaultAuditLogger.append(event);
}

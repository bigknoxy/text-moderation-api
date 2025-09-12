export interface AuditLog {
  logId: string;
  userId: string;
  action: string;
  details?: string;
  timestamp: number;
}

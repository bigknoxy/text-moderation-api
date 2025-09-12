import { describe, it, expect } from 'bun:test';
import type { UserContent } from '../../src/models/userContent';
import type { ModerationFlag } from '../../src/models/moderationFlag';
import type { ModeratorAction } from '../../src/models/moderatorAction';
import type { AuditLog } from '../../src/models/auditLog';

describe('UserContent model', () => {
  it('should create a valid UserContent object', () => {
    const obj: UserContent = { userId: 'u1', content: 'hello', timestamp: Date.now() };
    expect(obj.userId).toBe('u1');
    expect(obj.content).toBe('hello');
    expect(typeof obj.timestamp).toBe('number');
  });
});

describe('ModerationFlag model', () => {
  it('should create a valid ModerationFlag object', () => {
    const obj: ModerationFlag = { flagged: true, reasons: ['spam'], severity: 'high' };
    expect(obj.flagged).toBe(true);
    expect(obj.reasons).toContain('spam');
    expect(obj.severity).toBe('high');
  });
});

describe('ModeratorAction model', () => {
  it('should create a valid ModeratorAction object', () => {
    const obj: ModeratorAction = { actionId: 'a1', userId: 'u1', contentId: 'c1', actionType: 'approve', timestamp: Date.now() };
    expect(obj.actionId).toBe('a1');
    expect(obj.actionType).toBe('approve');
  });
});

describe('AuditLog model', () => {
  it('should create a valid AuditLog object', () => {
    const obj: AuditLog = { logId: 'l1', userId: 'u1', action: 'moderate', timestamp: Date.now() };
    expect(obj.logId).toBe('l1');
    expect(obj.action).toBe('moderate');
  });
});

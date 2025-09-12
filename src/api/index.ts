import type { UserContent } from '../models/userContent';
import { moderateContent } from '../services/moderation';
import { enqueueModerationTask } from '../services/queue';

/**
 * Handles moderation requests for user content.
 * Enqueues the content for audit logging and runs AI-powered moderation.
 * @param input - UserContent object containing userId, content, and timestamp
 * @returns ModerationFlag result (flagged, reasons, severity)
 */
export async function moderate(input: UserContent) {
  // Enqueue for audit/logging
  await enqueueModerationTask({
    userId: input.userId,
    content: input.content,
    timestamp: String(input.timestamp),
  });
  // Run moderation
  return await moderateContent(input);
}

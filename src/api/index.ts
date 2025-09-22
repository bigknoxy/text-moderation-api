import type { UserContent } from '../models/userContent';
import { moderateContent } from '../services/moderation';
import { enqueueModerationTask } from '../services/queue';
import { incrementModerationRequests } from '../services/metrics';

/**
 * Handles moderation requests for user content.
 * Enqueues the content for audit logging and runs AI-powered moderation.
 * Normalizes timestamp to ISO string.
 * @param input - UserContent object containing userId, content, and optional timestamp
 * @returns ModerationFlag result (flagged, reasons, severity)
 */
export async function moderate(input: UserContent) {
  // Normalize timestamp to ISO8601 string
  let ts: string;
  if (!input.timestamp) ts = new Date().toISOString();
  else if (typeof input.timestamp === 'number') ts = new Date(input.timestamp).toISOString();
  else ts = String(input.timestamp);

  // Increment metrics
  try {
    incrementModerationRequests();
  } catch (err) {
    // metrics should never block functionality
    console.warn('Failed to increment metrics', err);
  }

  // Enqueue for audit/logging (fire-and-forget). We don't want Redis failures to
  // block request handling or tests, so call enqueueModerationTask without awaiting.
  void enqueueModerationTask({
    userId: input.userId,
    content: input.content,
    timestamp: ts,
  });

  // Run moderation
  return await moderateContent({ ...input, timestamp: ts });
}

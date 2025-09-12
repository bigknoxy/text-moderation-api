/**
 * UserContent represents a moderation request payload.
 * - userId: ID of the user submitting content
 * - content: text to be moderated
 * - timestamp: submission time (number or ISO8601 string)
 */
export interface UserContent {
  userId: string;
  content: string;
  timestamp: number;
}

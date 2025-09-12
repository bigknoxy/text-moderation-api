/**
 * ModerationFlag describes the result of content moderation.
 * - flagged: true if content is flagged
 * - reasons: array of reasons (labels)
 * - severity: "low", "medium", or "high"
 */
export interface ModerationFlag {
  flagged: boolean;
  reasons: string[];
  severity: 'low' | 'medium' | 'high';
}

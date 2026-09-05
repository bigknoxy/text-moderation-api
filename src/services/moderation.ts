import type { UserContent } from '../models/userContent';
import type { ModerationFlag } from '../models/moderationFlag';
import { classifyText } from './hfClient';

/**
 * Uses the HF wrapper to moderate user content.
 * Candidate labels: hate_speech, violence, spam, safe
 * Returns flagged status, reasons, and severity.
 * @param content - UserContent object
 * @returns ModerationFlag result
 */
export async function moderateContent(content: UserContent): Promise<ModerationFlag> {
  const labels = ['hate_speech', 'violence', 'spam', 'safe'];

  const result = await classifyText(String(content.content), labels);

  let flagged = false;
  let reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  if (result && Array.isArray(result)) {
    for (const el of result as any[]) {
      if (el.label !== 'safe' && el.score > 0.5) {
        flagged = true;
        reasons.push(el.label);
        if (el.score > 0.8) severity = 'high';
        else if (el.score > 0.65) severity = 'medium';
      }
    }
  }

  return { flagged, reasons, severity };
}

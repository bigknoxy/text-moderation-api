import { InferenceClient } from '@huggingface/inference';
import type { UserContent } from '../models/userContent';
import type { ModerationFlag } from '../models/moderationFlag';

const HF_API_KEY = process.env.HF_API_KEY || '';
const inference = new InferenceClient(HF_API_KEY);

/**
 * Uses Hugging Face zero-shot classification to moderate user content.
 * Model: facebook/bart-large-mnli
 * Candidate labels: hate_speech, violence, spam, safe
 * Returns flagged status, reasons, and severity.
 * @param content - UserContent object
 * @returns ModerationFlag result
 */
export async function moderateContent(content: UserContent): Promise<ModerationFlag> {
  // Use zero-shot classification for moderation
  const labels = ['hate_speech', 'violence', 'spam', 'safe'];
  const result = await inference.zeroShotClassification({
    model: 'facebook/bart-large-mnli',
    inputs: content.content,
    parameters: { candidate_labels: labels },
  });

  let flagged = false;
  let reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  if (result && Array.isArray(result)) {
    for (const el of result) {
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

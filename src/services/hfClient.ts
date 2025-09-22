import { InferenceClient } from '@huggingface/inference';

// Small wrapper around HF inference to normalize outputs and provide a test mock path.
export async function classifyText(text: string, candidateLabels: string[]) {
  // Test/mock mode for CI and local tests without an HF key
  if (process.env.USE_TEST_MOCKS === '1') {
    const lower = (text || '').toLowerCase();
    // crude heuristics for tests: if text contains spammy/offensive tokens, return matching labels
    const matches = [] as { label: string; score: number }[];
    if (/(hate|hate speech|offensive|violence|spam)/.test(lower)) {
      if (candidateLabels.includes('hate_speech'))
        matches.push({ label: 'hate_speech', score: 0.95 });
      if (candidateLabels.includes('violence')) matches.push({ label: 'violence', score: 0.6 });
      if (candidateLabels.includes('spam')) matches.push({ label: 'spam', score: 0.6 });
    } else {
      if (candidateLabels.includes('safe')) matches.push({ label: 'safe', score: 0.99 });
    }
    // If no interesting labels matched, return a low-confidence safe
    if (matches.length === 0)
      return candidateLabels.map((l) => ({ label: l, score: l === 'safe' ? 0.99 : 0.01 }));
    return matches;
  }

  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) {
    throw new Error('HF_API_KEY not set. For tests set USE_TEST_MOCKS=1.');
  }

  const MODEL = process.env.HF_MODEL || 'facebook/bart-large-mnli';
  const client = new InferenceClient(HF_API_KEY);

  let res;
  if (MODEL === 'unitary/toxic-bert') {
    // Use textClassification for this model
    res = await client.textClassification({
      model: MODEL,
      inputs: text,
    });
    // Map to {label, score} format
    if (Array.isArray(res)) {
      return res.map((r: any) => ({ label: r.label, score: r.score }));
    }
    if (res && (res as any).labels && (res as any).scores) {
      const r: any = res;
      return r.labels.map((label: string, i: number) => ({ label, score: r.scores[i] }));
    }
  } else {
    // Use zeroShotClassification for general models
    res = await client.zeroShotClassification({
      model: MODEL,
      inputs: text,
      parameters: { candidate_labels: candidateLabels },
    });
    if (Array.isArray(res)) return res as any;
    if (res && (res as any).labels && (res as any).scores) {
      const r: any = res;
      return r.labels.map((label: string, i: number) => ({ label, score: r.scores[i] }));
    }
  }

  // Fallback: mark content as safe
  return [{ label: 'safe', score: 1 }];
}

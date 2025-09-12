import { describe, it, expect } from 'bun:test';
import { moderate } from '../../../src/api/index';

describe('POST /moderate contract', () => {
  it('should return moderation result for valid input', async () => {
    const input = {
      userId: 'user123',
      content: 'This is a test message with hate speech.',
      timestamp: Date.now(),
    };
    // Simulate API call (to be implemented)
    const result = await moderate(input);
    expect(result).toHaveProperty('flagged');
    expect(result).toHaveProperty('reasons');
    expect(Array.isArray(result.reasons)).toBe(true);
    // Should flag hate speech
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('hate_speech');
  });
});

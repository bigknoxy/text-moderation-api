import { describe, it, expect } from 'bun:test';
import { moderate } from '../../../src/api/index';

// Use mocks for external services in tests
process.env.USE_TEST_MOCKS = '1';

describe('POST /moderate contract', () => {
  it('should return moderation result for valid input', async () => {
    const input = {
      userId: 'user123',
      content: 'This is a test message with hate speech.',
      timestamp: new Date().toISOString(),
    };
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Test timed out')), 15000)
    );
    const resultPromise = (async () => {
      const result = await moderate(input as any);
      expect(result).toHaveProperty('flagged');
      expect(result).toHaveProperty('reasons');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.flagged).toBe(true);
      expect(result.reasons).toContain('hate_speech');
    })();
    await Promise.race([resultPromise, timeoutPromise]);
  });
});

import { describe, it, expect } from 'bun:test';
import { moderate } from '../../src/api/index';

describe('Moderation Performance', () => {
  it('should process 5 requests in under 5 seconds', async () => {
    const start = Date.now();
    const promises = [];
    // Warm up the model
    await moderate({ userId: 'warmup', content: 'test', timestamp: Date.now() });
    for (let i = 0; i < 5; i++) {
      promises.push(
        moderate({
          userId: `user${i}`,
          content: 'test',
          timestamp: Date.now(),
        })
      );
    }
    await Promise.all(promises);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});

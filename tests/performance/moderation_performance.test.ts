import { describe, it, expect } from 'bun:test';
import { moderate } from '../../src/api/index';

describe('Moderation Performance', () => {
  it('should process 100 requests in under 20 seconds', async () => {
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 100; i++) {
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
    expect(duration).toBeLessThan(20000);
  });
});

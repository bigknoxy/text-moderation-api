import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = createClient({ url: redisUrl });

// Ensure connect errors are surfaced
(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error('Redis connect error:', err);
  }
})();

const STREAM_NAME = 'moderation_queue';

export async function enqueueModerationTask(task: Record<string, string>) {
  await client.xAdd(STREAM_NAME, '*', task);
}

// Lightweight read wrapper for ad-hoc reads. Production worker should use consumer groups.
export async function readModerationTasks(count = 1) {
  try {
    const res = await client.xRead([{ key: STREAM_NAME, id: '$' }], { COUNT: count, BLOCK: 5000 });
    return res;
  } catch (err) {
    console.error('Error reading moderation tasks:', err);
    return null;
  }
}

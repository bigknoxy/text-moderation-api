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

// Enqueue a moderation task. If Redis is unavailable, silently fall back to a no-op so
// moderation requests don't block or fail. This keeps the API resilient in tests and
// in environments without Redis.
export async function enqueueModerationTask(task: Record<string, string>) {
  if (!client || typeof client.xAdd !== 'function') return;
  try {
    await client.xAdd(STREAM_NAME, '*', task);
  } catch (err) {
    // Log at debug level and swallow error to avoid breaking request flow.
    console.debug('Failed to enqueue moderation task (continuing without queue):', err);
  }
}

// Lightweight read wrapper for ad-hoc reads. Production worker should use consumer groups.
export async function readModerationTasks(count = 1) {
  try {
    if (!client || typeof client.xRead !== 'function') return null;
    const res = await client.xRead([{ key: STREAM_NAME, id: '$' }], { COUNT: count, BLOCK: 5000 });
    return res;
  } catch (err) {
    console.error('Error reading moderation tasks:', err);
    return null;
  }
}

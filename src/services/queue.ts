import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = createClient({ url: redisUrl });

client.connect();

const STREAM_NAME = 'moderation_queue';

export async function enqueueModerationTask(task: Record<string, string>) {
  await client.xAdd(STREAM_NAME, '*', task);
}

export async function readModerationTasks(count = 1) {
  // Read from stream
  const res = await client.xRead(
    [{ key: STREAM_NAME, id: '0' }],
    { COUNT: count, BLOCK: 5000 }
  );
  return res;
}

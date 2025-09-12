export function logModerationEvent(event: object) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[MODERATION LOG]', JSON.stringify(event));
  }
}

import { Counter, Registry } from 'prom-client';

const registry = new Registry();

export const moderationRequests = new Counter({
  name: 'moderation_requests_total',
  help: 'Total number of moderation requests',
  registers: [registry],
});

export function incrementModerationRequests() {
  moderationRequests.inc();
}

export function getMetrics() {
  return registry.metrics();
}

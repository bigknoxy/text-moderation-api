import { Counter, Histogram, Registry } from 'prom-client';

const registry = new Registry();

export const moderationRequests = new Counter({
  name: 'moderation_requests_total',
  help: 'Total number of moderation requests',
  registers: [registry],
});

export const authRequests = new Counter({
  name: 'auth_requests_total',
  help: 'Total number of API auth requests',
  labelNames: ['key', 'status'],
  registers: [registry],
});

export const authLatency = new Histogram({
  name: 'auth_latency_seconds',
  help: 'Auth middleware latency in seconds',
  labelNames: ['key', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export function incrementModerationRequests() {
  moderationRequests.inc();
}

export function recordAuthRequest(key: string, status: number) {
  authRequests.inc({ key, status: String(status) });
}

export function observeAuthLatency(key: string, status: number, seconds: number) {
  authLatency.observe({ key, status: String(status) }, seconds);
}

export function getMetrics() {
  return registry.metrics();
}

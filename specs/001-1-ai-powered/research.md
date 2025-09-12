# Phase 0: Research for AI-Powered Text Moderation Platform

## 1. Bun/TypeScript Best Practices for Scalable, Stateless APIs
- Use Bun for fast, efficient TypeScript runtime and package management.
- Prefer Elysia or Express for API layer; Elysia is Bun-native and highly performant.
- Structure code as stateless services; avoid global state.
- Use async/await for non-blocking request handling.
- Containerize with Docker for portability and scaling.

## 2. Open-Source Hugging Face Models for Text Moderation (CPU-only)
- Use models like "unitary/toxic-bert" or "martin-ha/toxic-comment-model" (MIT/Apache 2.0 licenses).
- Download and run models locally using Hugging Face Transformers (Node.js/TypeScript bindings available).
- Select small models optimized for CPU inference; avoid large transformer models requiring GPU.
- Evaluate accuracy and speed; trade off for real-time moderation.

## 3. Queueing and Containerization for Horizontal Scaling
- Use Redis Streams or RabbitMQ for open-source, lightweight message queueing.
- Each moderation request is queued and processed by stateless worker containers.
- Scale horizontally by adding more worker containers; orchestrate with Docker Compose or K3s.
- Use Nginx or Caddy as reverse proxy for load balancing.

## 4. Minimal Logging and Monitoring (Prometheus)
- Log only moderation actions and errors; rotate logs with logrotate.
- Use Prometheus for metrics (request rate, latency, error rate).
- Optional: Grafana for dashboards.
- Store logs locally; avoid cloud dependencies.

## 5. Summary of Decisions
- Bun/TypeScript for API and service logic.
- Elysia (preferred) or Express for API layer.
- Hugging Face Transformers (CPU-only, open-source models).
- Redis Streams for queueing.
- Docker for containerization and scaling.
- Prometheus for monitoring.
- Minimal local logging.

## Alternatives Considered
- Python/FastAPI: More mature ML ecosystem, but Bun/TypeScript preferred for performance and JS integration.
- Kafka: Powerful but overkill for initial scale; Redis Streams is simpler.
- Cloud logging/monitoring: Not used due to $0 budget and self-hosting requirement.
- Large transformer models: Rejected due to CPU-only constraint.

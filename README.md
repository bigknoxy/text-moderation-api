# 🛡️ AI-Powered Text Moderation Platform

## 🚀 Overview

Welcome to the **AI-Powered Text Moderation Platform**! This project provides fast, scalable, and accurate moderation for user-generated content using Hugging Face AI models and Redis for queueing and audit logging. Built with Bun for speed and modern developer experience.

- ⚡ **Real-time moderation** of user content
- 🤖 **AI-powered flagging** for toxicity, hate speech, and more
- 📝 **Audit logging** for transparency and compliance
- 📊 **Metrics endpoint** for observability
- 🐳 **Docker-ready** for easy deployment

---

## 🏗️ Architecture & Tech Stack

- **Bun** (TypeScript runtime)
- **Redis** (queue, audit log)
- **Hugging Face Inference API** (AI moderation)
- **Prometheus** (metrics, optional)
- **ESLint & Prettier** (code quality)
- **Docker Compose** (local dev & deployment)

> See [`specs/001-1-ai-powered/plan.md`](specs/001-1-ai-powered/plan.md) for detailed architecture.

---

## 🏁 Quickstart

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd text_moderation
bun install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
HF_API_KEY=your_hf_api_key_here
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis

- Locally: `redis-server`
- Or with Docker Compose (recommended):

```bash
docker compose up --build
```

### 4. Run Tests

```bash
bun test
```

### 5. Start the Service

```bash
bun run index.ts
```

---

## ⚙️ Environment Variables

| Variable   | Description                    | Example                  |
| ---------- | ------------------------------ | ------------------------ |
| HF_API_KEY | Hugging Face Inference API key | `hf_xxx`                 |
| REDIS_URL  | Redis connection string        | `redis://localhost:6379` |

---

## 🐳 Docker & Local Development

- Use Docker Compose to run both Redis and the app:

```bash
docker compose up --build
```

- Edit `docker-compose.yml` to customize ports or environment.

---

## 📖 API Documentation

- Interactive Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- OpenAPI Spec (YAML): [http://localhost:3000/openapi.yaml](http://localhost:3000/openapi.yaml)

## 📡 API Usage Example

### Moderate Content

`POST /moderate`

```json
{
  "userId": "user123",
  "content": "This is a test message.",
  "timestamp": "2025-09-12T19:10:39.527Z"
}
```

**Response:**

```json
{
  "flagged": false,
  "reasons": [],
  "severity": "low"
}
```

> Note: `timestamp` is required and should be an ISO8601 string. The response will include `flagged` (boolean), `reasons` (array of strings), and `severity` ("low", "medium", or "high").

---

## 🔑 API Authentication & Rate Limiting

The platform supports robust API authentication and rate limiting for all endpoints:

- **Key-based authentication**: Every API request must include a valid API key in the `x-api-key` header.
- **Rate limiting**: Each key is subject to per-minute and per-day quotas, enforced at the middleware level.
- **Audit logging**: All authentication attempts (success/failure) are logged for compliance and monitoring.
- **Metrics**: Per-key usage and rate limit events are exposed via Prometheus metrics.
- **Key management CLI**: Use the CLI to create, list, and revoke API keys (see [Key Manager CLI](cli/key-manager.ts)).

**Learn more:**

- [Quickstart: API Authentication](specs/002-1-api-authentication/quickstart.md)
- [Feature Plan](specs/002-1-api-authentication/plan.md)
- [Specification](specs/002-1-api-authentication/spec.md)
- [OpenAPI Contract](specs/002-1-api-authentication/contracts/openapi.yaml)

---

## 🧪 Testing, Linting & Formatting

- **Run all tests:**
  ```bash
  bun test
  ```
- **Lint code:**
  ```bash
  bun lint
  ```
- **Format code:**
  ```bash
  bun format
  ```

> All tests (unit, contract, integration, performance) must pass before deployment.

---

## 🛠️ Troubleshooting & FAQ

### Redis Issues

- Ensure Redis is running (`docker ps` or `redis-server`).
- Check `REDIS_URL` in `.env`.

### Hugging Face API Issues

- Verify `HF_API_KEY` is set and valid.
- Check logs for API errors or quota issues.

### Docker Issues

- Run `docker compose down` then `docker compose up --build` to reset.
- Check for port conflicts or missing env vars.

### Performance Test Fails

- May be due to Hugging Face rate limits or system resources.
- Adjust time threshold in `tests/performance/moderation_performance.test.ts` if needed.

---

## 🤝 Contributing

We welcome contributions! Please:

- Follow code style (ESLint, Prettier)
- Write tests for new features
- Document changes
- Open issues or PRs for discussion

---

## 📄 License & Credits

- MIT License
- Built with ❤️ by the Opencode community
- Powered by [Bun](https://bun.sh), [Redis](https://redis.io), and [Hugging Face](https://huggingface.co)

---

## 🌟 Useful Links

- [Quickstart Guide: Moderation](specs/001-1-ai-powered/quickstart.md)
- [Quickstart Guide: API Authentication](specs/002-1-api-authentication/quickstart.md)
- [Architecture Plan](specs/001-1-ai-powered/plan.md)
- [API Contract: Moderation](specs/001-1-ai-powered/contracts/openapi.yaml)
- [API Contract: Authentication](specs/002-1-api-authentication/contracts/openapi.yaml)
- [Tasks & Progress](specs/001-1-ai-powered/tasks.md)

---

# 🎉 Happy Moderating!

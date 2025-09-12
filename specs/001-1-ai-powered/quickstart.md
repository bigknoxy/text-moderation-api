# Quickstart: AI-Powered Text Moderation Platform

_Last updated: September 2025_

## Setup

1. Clone the repository
2. Install Bun (https://bun.sh)
3. Run `bun install` in the project root
4. Create a `.env` file in the project root with:
   - `HF_API_KEY=your_hf_api_key_here`
   - `REDIS_URL=redis://localhost:6379` (or your Redis URL)
5. Start Redis server (or use Docker Compose)
6. Run tests: `bun test`
7. Start the service: `bun run index.ts`

_You may use Docker Compose to start both Redis and the app together._

## Docker Compose

```
docker-compose up --build
```

## Troubleshooting

### Redis Issues

- Ensure Redis is running locally or via Docker Compose.
- Default URL: `redis://localhost:6379`
- If connection fails, check Docker logs or run `docker ps` to verify Redis container is up.

### Hugging Face API Issues

- Make sure `HF_API_KEY` is set in your `.env` file.
- If moderation requests fail, verify your API key is valid and has sufficient quota.
- Check logs for error messages related to Hugging Face API.

### Docker Issues

- If containers fail to start, run `docker-compose down` then `docker-compose up --build`.
- Check for port conflicts or missing environment variables.

### General

- If tests fail, review error output for missing dependencies or misconfigured environment variables.
- For performance test failures, see Validation section above.

## Example Request

POST /moderate

```
{
  "userId": "user123",
  "content": "This is a test message.",
  "timestamp": "2025-09-12T19:10:39.527Z"
}
```

Example Response:

```
{
  "flagged": false,
  "reasons": [],
  "severity": "low"
}
```

> Note: `timestamp` is required and should be an ISO8601 string. The response will include `flagged` (boolean), `reasons` (array of strings), and `severity` ("low", "medium", or "high").

## Validation

### 1. Run All Tests

- Execute `bun test` to run unit, contract, integration, and performance tests.
- All tests should pass. If any fail, see Troubleshooting below.

### 2. Check Logs

- Service logs will show moderation events and errors.
- Look for lines indicating successful moderation, Redis connectivity, and Hugging Face API usage.

### 3. Metrics

- If enabled, access Prometheus metrics endpoint (see README for details).

### 4. Linting & Formatting

- Run `bun lint` to check code style (requires ESLint).
- Run `bun format` to auto-format code (requires Prettier).
- Fix any reported issues before committing code.

### 5. Performance Test Caveats

- The performance test simulates high-throughput moderation requests.
- If it fails, check for:
  - Slow external API responses (Hugging Face rate limits)
  - Redis connection issues
  - Insufficient system resources
- You may adjust the time threshold in `tests/performance/moderation_performance.test.ts` if needed.

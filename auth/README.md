# Auth Service

This is the authentication microservice for the Flimsy platform.

It provides endpoints for registration, email verification, login/logout, password reset, profile management, and login history tracking. The service is instrumented with Prometheus metrics and ships logs to Grafana Loki.

## Environment variables

Required:

- `MONGO_URI` - MongoDB connection string
- `DB_NAME` - (optional) MongoDB database name
- `JWT_SECRET` - Secret for signing JWTs
- `BASE_URL` - Base URL used when generating links in emails (e.g., https://api.example.com)
- `RESEND_API_KEY` - Resend API key for sending emails

Optional (observability & ops):

- `SERVICE_NAME` - Service name used for metrics/log labels (default: `auth-service`)
- `HOSTNAME` - Instance hostname (default: `local`)
- `LOKI_URL` - Loki endpoint (e.g., `http://loki:3100`)
- `LOKI_USERNAME` / `LOKI_PASSWORD` - If Loki requires basic auth
- `METRICS_AUTH_TOKEN` - Token required to read `/metrics` (optional)
- `ALLOWED_ORIGINS` - Comma-separated allowed CORS origins
- `PORT` - Port to run service on (default: 5000)

## Quick start (local)

Install dependencies:

```powershell
cd services/auth
npm install
```

Run development server:

```powershell
npm run dev
```

## Docker

Build (multi-stage):

```powershell
# from repository root
docker build -t filmsy/auth-service:latest ./services/auth
```

Run:

```powershell
docker run -e MONGO_URI="mongodb://..." -e JWT_SECRET="your-secret" -p 5000:5000 filmsy/auth-service:latest
```

## Metrics & Logging

- Metrics exposed at `/metrics`. If `METRICS_AUTH_TOKEN` is set, requests must include either `x-metrics-token` header with that token or `Authorization: Bearer <token>`.
- Loki transport will be used if `LOKI_URL` is set. Logs include labels for `service` and `instance` to make logs searchable in Grafana.

## Notes

- Input validation is implemented with `express-validator` and invalid requests return `400` with validation details.
- Rate limiting is applied for authentication endpoints.

If you want me to add sample Prometheus scrape configs or a Grafana dashboard JSON, tell me and I'll add them.

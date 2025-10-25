import client from "prom-client";

// Setup default metrics with service-level labels
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({
  labels: {
    service: process.env.SERVICE_NAME || "upload_service",
    instance: process.env.HOSTNAME || "local",
  },
  prefix: `${process.env.SERVICE_NAME || "upload_service"}_`,
});

// Histogram for HTTP request durations
const httpRequestDuration = new client.Histogram({
  name: `${
    process.env.SERVICE_NAME || "upload_service"
  }_http_request_duration_seconds`,
  help: "Duration of HTTP requests in seconds",
  labelNames: ["service", "instance", "method", "route", "status_code"],
});

const authCounter = new client.Counter({
  name: `${process.env.SERVICE_NAME || "upload_service"}_auth_events_total`,
  help: "Counts of authentication related events",
  labelNames: ["service", "instance", "event", "status"],
});

const rateLimitCounter = new client.Counter({
  name: `${process.env.SERVICE_NAME || "upload_service"}_rate_limit_hits_total`,
  help: "Counts of rate limit hits",
  labelNames: ["service", "instance", "route"],
});

export { client, httpRequestDuration, authCounter, rateLimitCounter };

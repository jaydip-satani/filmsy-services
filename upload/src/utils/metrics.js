import client from "prom-client";

export const httpRequestDuration = new client.Histogram({
  name: `${process.env.SERVICE_NAME}_http_request_duration_seconds`,
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
});

export const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({
  labels: { service: process.env.SERVICE_NAME },
});

export default client;

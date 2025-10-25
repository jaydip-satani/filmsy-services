import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import winston from "winston";
import LokiTransport from "winston-loki";
import uploadRoutes from "./routes/upload.route.js";
import { client, httpRequestDuration } from "./utils/metrics.js";
import connectDB from "./utils/db.js";

const PORT = process.env.PORT || 5001;
await connectDB();

const app = express();

// ----------------------------
// Middleware Setup
// ----------------------------
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "100mb" }));

// ----------------------------
// Winston + Loki Logger Setup
// ----------------------------
const loggerTransports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(
        ({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`
      )
    ),
  }),
];

if (process.env.LOKI_URL) {
  loggerTransports.push(
    new LokiTransport({
      host: process.env.LOKI_URL, // e.g. http://loki:3100
      labels: {
        service: process.env.SERVICE_NAME || "upload_service",
        instance: process.env.HOSTNAME || "local",
      },
      json: true,
      batching: true,
      interval: 5,
      basicAuth:
        process.env.LOKI_USERNAME && process.env.LOKI_PASSWORD
          ? `${process.env.LOKI_USERNAME}:${process.env.LOKI_PASSWORD}`
          : undefined,
    })
  );
}

const logger = winston.createLogger({ transports: loggerTransports });
logger.info("🚀 Logger initialized with Loki transport");

// ----------------------------
// Prometheus Middleware
// ----------------------------
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      service: process.env.SERVICE_NAME || "upload_service",
      instance: process.env.HOSTNAME || "local",
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
    });

    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`);
  });
  next();
});

// ----------------------------
// Routes
// ----------------------------
app.use("/api", uploadRoutes);

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    logger.error(`Metrics endpoint error: ${err.message}`);
    res.status(500).end(err.message);
  }
});

app.get("/", (req, res) => res.send("🚀 Upload Service is running"));

// ----------------------------
// Error Handler
// ----------------------------
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ----------------------------
// Start Server
// ----------------------------
app.listen(PORT, () =>
  logger.info(`✅ Upload Service running on port ${PORT}`)
);

export default app;

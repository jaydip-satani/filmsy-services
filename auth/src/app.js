import "dotenv/config";
import express from "express";
import cors from "cors";
import promClient from "prom-client";
import winston from "winston";
import LokiTransport from "winston-loki";
import authRoutes from "./routes/auth.route.js";
import { asyncHandler, ApiResponse } from "winston-asynchandler";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  maxAge: 86400,
};
app.use(express.json());
app.use(cors(corsOptions));

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(
          ({ timestamp, level, message }) =>
            `[${timestamp}] ${level}: ${message}`
        )
      ),
    }),
    new LokiTransport({
      host: process.env.LOKI_URL, // e.g. http://loki:3100
      labels: { service: "auth-service" },
      json: true,
      batching: true,
      interval: 5,
    }),
  ],
});

logger.info("🚀 Logger initialized with Loki transport");

const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ prefix: "auth_service_" });

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
    });
  });
  next();
});

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.status(200).json(ApiResponse(200, Date.now()));
  })
);
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("Auth Service Running"));

app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`✅ Auth Service running on port ${PORT}`));

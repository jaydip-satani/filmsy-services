import "dotenv/config";
import express from "express";
import cors from "cors";
import promClient from "prom-client";
import winston from "winston";
import LokiTransport from "winston-loki";
import helmet from "helmet";
import authRoutes from "./routes/auth.route.js";
import { asyncHandler, ApiResponse } from "winston-asynchandler";
import connectDB from "./utils/db.js";
import cookieparser from "cookie-parser";

const app = express();
await connectDB();
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
app.use(cookieparser());
app.use(helmet());
app.set("trust proxy", true);
// limit JSON body size to mitigate large payload attacks
app.use(express.json({ limit: "10kb" }));
app.use(cors(corsOptions));

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

// Add Loki transport only when LOKI_URL is provided
if (process.env.LOKI_URL) {
  loggerTransports.push(
    new LokiTransport({
      host: process.env.LOKI_URL, // e.g. http://loki:3100
      labels: { service: "auth-service" },
      json: true,
      batching: true,
      interval: 5,
    })
  );
}

const logger = winston.createLogger({ transports: loggerTransports });

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
  // If METRICS_AUTH_TOKEN is set, require a header x-metrics-token to match
  if (process.env.METRICS_AUTH_TOKEN) {
    const token = req.headers["x-metrics-token"];
    if (!token || token !== process.env.METRICS_AUTH_TOKEN) {
      return res.status(401).end("Unauthorized");
    }
  }

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

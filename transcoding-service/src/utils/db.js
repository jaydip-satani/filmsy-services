// import mongoose from "mongoose";
// import winston from "winston";
// import LokiTransport from "winston-loki";
// import promClient from "prom-client";

// const mongoConnectionGauge = new promClient.Gauge({
//   name: "mongodb_connection_status",
//   help: "MongoDB connection status: 1 for connected, 0 for disconnected",
// });

// const mongoQueryCounter = new promClient.Counter({
//   name: "mongodb_query_count",
//   help: "Total number of MongoDB queries executed",
// });

// const mongoQueryDuration = new promClient.Histogram({
//   name: "mongodb_query_duration_seconds",
//   help: "Histogram of MongoDB query durations in seconds",
//   labelNames: ["operation", "collection"],
// });

// const logger = winston.createLogger({
//   transports: [
//     new winston.transports.Console({
//       format: winston.format.combine(
//         winston.format.colorize(),
//         winston.format.timestamp(),
//         winston.format.printf(
//           ({ timestamp, level, message }) =>
//             `[${timestamp}] ${level}: ${message}`
//         )
//       ),
//     }),
//     new LokiTransport({
//       host: process.env.LOKI_URL,
//       labels: { service: "transcoding-service", module: "database" },
//       json: true,
//       batching: true,
//       interval: 5,
//     }),
//   ],
// });
// const connectDB = async () => {
//   try {
//     const startTime = Date.now();

//     await mongoose.connect(process.env.MONGO_URI, {
//       dbName: process.env.DB_NAME || "upload_service",
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 45000,
//       family: 4,
//     });

//     const duration = (Date.now() - startTime) / 1000;
//     mongoConnectionGauge.set(1);
//     logger.info(`✅ MongoDB connected in ${duration}s`);

//     mongoose.set(
//       "debug",
//       function (collectionName, method, query, doc, options) {
//         const endTimer = mongoQueryDuration.startTimer();
//         mongoQueryCounter.inc();
//         endTimer({ operation: method, collection: collectionName });
//         logger.info(
//           `📦 [${collectionName}] ${method} → ${JSON.stringify(query)}`
//         );
//       }
//     );

//     mongoose.connection.on("disconnected", () => {
//       mongoConnectionGauge.set(0);
//       logger.warn("⚠️ MongoDB disconnected");
//     });

//     mongoose.connection.on("reconnected", () => {
//       mongoConnectionGauge.set(1);
//       logger.info("🔁 MongoDB reconnected");
//     });

//     mongoose.connection.on("error", (err) => {
//       mongoConnectionGauge.set(0);
//       logger.error("❌ MongoDB error: " + err.message);
//     });
//   } catch (error) {
//     mongoConnectionGauge.set(0);
//     logger.error("❌ MongoDB connection failed: " + error.message);
//     process.exit(1);
//   }
// };

// export default connectDB;

import mongoose from "mongoose";
import { logger } from "./logger.js";

export const uploadDB = mongoose.createConnection(process.env.MONGO_URI, {
  dbName: process.env.UPLOAD_DB_NAME,
});

export const transcodeDB = mongoose.createConnection(process.env.MONGO_URI, {
  dbName: process.env.TRANSCODE_DB_NAME,
});

uploadDB.on("connected", () => logger.info("✅ Connected to Upload DB"));
transcodeDB.on("connected", () => logger.info("✅ Connected to Transcode DB"));

uploadDB.on("error", (err) => logger.error("❌ Upload DB Error:", err));
transcodeDB.on("error", (err) => logger.error("❌ Transcode DB Error:", err));

import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { startPolling } from "./jobs/pollVideos.js";
import { logger } from "./utils/logger.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { ApiResponse } from "./utils/apiResponse.js";
import { setupMetrics } from "./utils/metrics.js";
import { getTranscodedVideo } from "./controllers/transcode.controller.js";

const app = express();
app.use(express.json());
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
app.use(cors(corsOptions));

const PORT = process.env.PORT || 8002;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("MongoDB connected!");
    startPolling();
  })
  .catch((err) => logger.error("MongoDB connection error:", err));

// Metrics endpoint
setupMetrics(app);

// Example API route
app.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(new ApiResponse(200, "Video Transcoding Service Running"));
  })
);

app.get("/api/transcoded/:url", getTranscodedVideo);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

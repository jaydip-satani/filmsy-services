import rateLimit from "express-rate-limit";
import { rateLimitCounter } from "../utils/metrics.js";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    rateLimitCounter.inc({ route: req.originalUrl }, 1);
    res
      .status(429)
      .json({ message: "Too many requests, please try again later" });
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again later" },
  handler: (req, res, next) => {
    rateLimitCounter.inc({ route: req.originalUrl }, 1);
    res
      .status(429)
      .json({ message: "Too many login attempts, please try again later" });
  },
});

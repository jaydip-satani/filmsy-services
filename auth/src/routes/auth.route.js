import express from "express";
import { body, param } from "express-validator";
import {
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  getUserById,
  profile,
  resendVerificationEmail,
  forgotPassword,
  updateProfile,
  getLoginHistory,
  resetPassword,
  failedLoginAttempts,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  authLimiter,
  loginLimiter,
} from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  body("name").isString().isLength({ min: 2, max: 100 }).trim(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  registerUser
);

router.post(
  "/login",
  loginLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8 }),
  loginUser
);

router.get("/login-history", authMiddleware, getLoginHistory);
router.get("/failed-login-attempts", authMiddleware, failedLoginAttempts);
router.post("/logout", authMiddleware, logoutUser);

router.get(
  "/verifyEmail/:token",
  param("token").isString().isLength({ min: 10 }),
  verifyEmail
);
router.post(
  "/resend-verification",
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  resendVerificationEmail
);

router.post(
  "/forgot-password",
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  forgotPassword
);

router.post(
  "/reset-password/:token",
  authLimiter,
  param("token").isString().isLength({ min: 10 }),
  body("newPassword").isLength({ min: 8 }),
  body("confirmPassword").isLength({ min: 8 }),
  resetPassword
);

router.get("/me", authMiddleware, profile);
router.put(
  "/profile",
  authMiddleware,
  body("name").isString().isLength({ min: 2, max: 100 }).trim(),
  updateProfile
);
router.get("/me/:id", authMiddleware, getUserById);

export default router;

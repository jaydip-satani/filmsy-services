import express from "express";
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

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/login-history", authMiddleware, getLoginHistory);
router.get("/failed-login-attempts", authMiddleware, failedLoginAttempts);
router.post("/logout", authMiddleware, logoutUser);

router.get("/verifyEmail/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/me", authMiddleware, profile);
router.put("/profile", authMiddleware, updateProfile);
router.get("/me/:id", authMiddleware, getUserById);

export default router;

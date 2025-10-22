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
  verifyTokenController,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  authLimiter,
  loginLimiter,
} from "../middleware/rateLimit.middleware.js";
import { handleValidation } from "../middleware/validation.middleware.js";

const router = express.Router();
/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: "Verify JWT token"
 *     description: "Verifies a JWT token and returns decoded user data. Used by internal services."
 *     responses:
 *       200:
 *         description: "Token verified successfully"
 *       401:
 *         description: "Missing or invalid token"
 */
router.post("/verify", verifyTokenController);
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: "Register a new user"
 *     description: "Register a new user with name, email, and password."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 description: User's email address
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "Password123!"
 *     responses:
 *       201:
 *         description: "User successfully registered"
 *       400:
 *         description: "All fields are required"
 *       409:
 *         description: "Email already exists"
 */
router.post(
  "/register",
  authLimiter,
  body("name").isString().isLength({ min: 2, max: 100 }).trim(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  handleValidation,
  registerUser
);

/**
 * @swagger
 * /api/auth/verifyEmail/{token}:
 *   get:
 *     summary: "Verify email address"
 *     description: "Verify the email of the user using a verification token."
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: The token sent to the user's email for verification
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Email verified successfully"
 *       400:
 *         description: "Invalid or expired token"
 */
router.get(
  "/verifyEmail/:token",
  param("token").isString().isLength({ min: 10 }),
  handleValidation,
  verifyEmail
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: "Login user"
 *     description: "Login a user with email and password."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *                 example: "johndoe@example.com"
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: "Password123!"
 *     responses:
 *       200:
 *         description: "Login successful"
 *       400:
 *         description: "Email and password required"
 *       401:
 *         description: "Invalid credentials"
 *       403:
 *         description: "Account locked"
 *       404:
 *         description: "User not found"
 */
router.post(
  "/login",
  loginLimiter,
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  handleValidation,
  loginUser
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: "Logout user"
 *     description: "Logout the authenticated user."
 *     responses:
 *       200:
 *         description: "Logout successful"
 */
router.post("/logout", authMiddleware, logoutUser);

/**
 * @swagger
 * /api/auth/me/{id}:
 *   get:
 *     summary: "Get user details by ID"
 *     description: "Fetch user details by user ID."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User's unique ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "Successfully retrieved user details"
 *       404:
 *         description: "User not found"
 */
router.get("/me/:id", authMiddleware, getUserById);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: "Get authenticated user profile"
 *     description: "Fetch profile details of the currently authenticated user."
 *     responses:
 *       200:
 *         description: "Successfully retrieved user profile"
 *       401:
 *         description: "Unauthorized, invalid token"
 */
router.get("/me", authMiddleware, profile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: "Update user profile"
 *     description: "Update the user's name in their profile."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New name of the user
 *                 example: "John Doe"
 *     responses:
 *       200:
 *         description: "Profile updated successfully"
 *       400:
 *         description: "Name is required"
 *       401:
 *         description: "Unauthorized, invalid token"
 */
router.put(
  "/profile",
  authMiddleware,
  body("name").isString().isLength({ min: 2, max: 100 }).trim(),
  handleValidation,
  updateProfile
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: "Request password reset"
 *     description: "Send a password reset link to the user's email."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *                 example: "johndoe@example.com"
 *     responses:
 *       200:
 *         description: "Password reset email sent"
 *       400:
 *         description: "Email required"
 *       404:
 *         description: "User not found"
 */
router.post(
  "/forgot-password",
  body("email").isEmail().normalizeEmail(),
  handleValidation,
  forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     summary: "Reset password"
 *     description: "Reset the user's password using a valid reset token."
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: The password reset token
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: The new password
 *                 example: "NewPassword123!"
 *               confirmPassword:
 *                 type: string
 *                 description: The confirmation of the new password
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: "Password reset successfully"
 *       400:
 *         description: "Passwords do not match or other validation error"
 *       404:
 *         description: "Invalid or expired token"
 */
router.post(
  "/reset-password/:token",
  param("token").isString().isLength({ min: 10 }),
  body("newPassword").isLength({ min: 8 }),
  body("confirmPassword").isLength({ min: 8 }),
  handleValidation,
  resetPassword
);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: "Resend email verification"
 *     description: "Resend the email verification link to the user."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *                 example: "johndoe@example.com"
 *     responses:
 *       200:
 *         description: "Verification email resent"
 *       400:
 *         description: "Email required"
 *       404:
 *         description: "User not found"
 */
router.post(
  "/resend-verification",
  authLimiter,
  body("email").isEmail().normalizeEmail(),
  handleValidation,
  resendVerificationEmail
);

/**
 * @swagger
 * /api/auth/login-history:
 *   get:
 *     summary: "Get user login history"
 *     description: "Retrieve the login history (IP and device) of the authenticated user."
 *     responses:
 *       200:
 *         description: "Login history retrieved successfully"
 *       401:
 *         description: "Unauthorized"
 */
router.get("/login-history", authMiddleware, getLoginHistory);

/**
 * @swagger
 * /api/auth/failed-login-attempts:
 *   get:
 *     summary: "Get failed login attempts"
 *     description: "Retrieve failed login attempts of the authenticated user."
 *     responses:
 *       200:
 *         description: "Failed login attempts fetched"
 *       401:
 *         description: "Unauthorized"
 */
router.get("/failed-login-attempts", authMiddleware, failedLoginAttempts);

export default router;

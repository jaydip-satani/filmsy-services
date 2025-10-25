import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  sendMail,
  emailVerificationMailGenContent,
  forgotPasswordMailGenContent,
} from "../utils/mail.js";
import { generateVerificationToken } from "../utils/generateVerificationToken.js";
import { getClientIp } from "../utils/ip.js";
import UserIP from "../models/userIp.model.js";
import UserDevice from "../models/userDevice.model.js";
import FailedLogin from "../models/failedLogin.model.js";
import { getUserDevice } from "../utils/getUserDevice.js";
import crypto from "crypto";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { authCounter } from "../utils/metrics.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    authCounter.inc({ event: "register", status: "failure" }, 1);
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, "User already exists");
  const { token, hashedToken, tokenExpiry } = generateVerificationToken();

  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: tokenExpiry,
    userVerified: false,
  });

  await sendMail({
    email,
    subject: "Verify your email",
    mailGenContent: emailVerificationMailGenContent(
      name,
      `${process.env.BASE_URL}/api/auth/verifyEmail/${token}`
    ),
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, "User registered successfully", { userId: user._id })
    );
  // metric
  authCounter.inc({ event: "register", status: "success" }, 1);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    authCounter.inc({ event: "verify_email", status: "failure" }, 1);
    throw new ApiError(400, "Token required");
  }

  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({ emailVerificationToken: hashed });

  if (!user) {
    authCounter.inc({ event: "verify_email", status: "failure" }, 1);
    throw new ApiError(400, "Invalid token");
  }
  if (user.userVerified)
    return res.status(200).json(new ApiResponse(200, "Already verified"));

  if (user.emailVerificationExpiry < new Date())
    throw new ApiError(400, "Token expired");

  user.userVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiry = null;
  await user.save();

  res.status(200).json(new ApiResponse(200, "Email verified successfully"));
  authCounter.inc({ event: "verify_email", status: "success" }, 1);
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const clientIp = getClientIp(req) || "unknown";
  const userAgent = getUserDevice(req);
  if (!email || !password) {
    authCounter.inc({ event: "login", status: "failure" }, 1);
    throw new ApiError(400, "Email and password required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    await FailedLogin.create({
      email: email,
      ip: clientIp,
      device: userAgent,
      reason: "User not found",
    });
    authCounter.inc({ event: "login", status: "failure" }, 1);
    throw new ApiError(404, "User not found");
  }

  if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
    const minutesLeft = Math.ceil(
      (user.accountLockedUntil.getTime() - Date.now()) / 60000
    );
    await FailedLogin.create({
      email: email,
      ip: clientIp,
      device: userAgent,
      reason: `Account locked for ${minutesLeft} more minute(s)`,
    });
    authCounter.inc({ event: "login", status: "failure" }, 1);
    throw new ApiError(
      403,
      `Account locked. Try again in ${minutesLeft} minute(s)`
    );
  }

  if (!user.userVerified) {
    authCounter.inc({ event: "login", status: "failure" }, 1);
    throw new ApiError(401, "Please verify your email first");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { failedLoginAttempts: 1 } },
      { new: true }
    );

    await FailedLogin.create({
      user: user._id,
      email: user.email,
      ip: clientIp,
      device: userAgent,
      reason: "Incorrect password",
    });

    if (updatedUser.failedLoginAttempts >= 5) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { accountLockedUntil: new Date(Date.now() + 60 * 60 * 1000) },
          $inc: { failedLoginAttempts: -updatedUser.failedLoginAttempts },
        }
      );
    }
    authCounter.inc({ event: "login", status: "failure" }, 1);
    throw new ApiError(401, "Invalid credentials");
  }

  user.failedLoginAttempts = 0;
  user.accountLockedUntil = null;
  user.lastLogin = new Date();
  await user.save();

  await UserIP.create({
    user: user._id,
    ip: clientIp,
    loginAt: new Date(),
  });

  await UserDevice.create({
    user: user._id,
    deviceData: userAgent,
    loginAt: new Date(),
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 24 * 60 * 60 * 1000,
  });
  authCounter.inc({ event: "login", status: "success" }, 1);

  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        lastLogin: user.lastLogin,
        ip: clientIp,
      },
    })
  );
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("authToken");
  res.status(200).json(new ApiResponse(200, "User logged out successfully"));
  authCounter.inc({ event: "logout", status: "success" }, 1);
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new ApiError(404, "User not found");
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
  };
  res.status(200).json(new ApiResponse(200, "User found", userData));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    authCounter.inc({ event: "forgot_password", status: "failure" }, 1);
    throw new ApiError(400, "Email required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    authCounter.inc({ event: "forgot_password", status: "failure" }, 1);
    throw new ApiError(404, "User not found");
  }
  const { token, hashedToken, tokenExpiry } = generateVerificationToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpiry = tokenExpiry;
  await user.save();

  const resetUrl = `${process.env.RESET_PASSWORD_URL}/${token}`;

  await sendMail({
    email,
    subject: "Password Reset",
    mailGenContent: forgotPasswordMailGenContent(email, resetUrl),
  });

  res.status(200).json(new ApiResponse(200, "Password reset email sent"));
  authCounter.inc({ event: "forgot_password", status: "success" }, 1);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = req.params.token;
  const { newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    authCounter.inc({ event: "reset_password", status: "failure" }, 1);
    throw new ApiError(400, "All fields required");
  }

  if (newPassword !== confirmPassword) {
    authCounter.inc({ event: "reset_password", status: "failure" }, 1);
    throw new ApiError(400, "Passwords do not match");
  }

  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiry: { $gt: Date.now() },
  });

  if (!user) {
    authCounter.inc({ event: "reset_password", status: "failure" }, 1);
    throw new ApiError(400, "Token is invalid or has expired");
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;

  await user.save();

  res.status(200).json(new ApiResponse(200, "Password reset successfully"));
  authCounter.inc({ event: "reset_password", status: "success" }, 1);
});

export const profile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    authCounter.inc({ event: "profile_view", status: "failure" }, 1);
    throw new ApiError(404, "User not found");
  }
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    verified: user.userVerified,
  };
  res.status(200).json(new ApiResponse(200, "User profile", userData));
  authCounter.inc({ event: "profile_view", status: "success" }, 1);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    authCounter.inc({ event: "update_profile", status: "failure" }, 1);
    throw new ApiError(400, "Name is required");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    authCounter.inc({ event: "update_profile", status: "failure" }, 1);
    throw new ApiError(404, "User not found");
  }

  user.name = name;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, "Profile updated successfully", user.name));
  authCounter.inc({ event: "update_profile", status: "success" }, 1);
});
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    authCounter.inc({ event: "resend_verification", status: "failure" }, 1);
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    authCounter.inc({ event: "resend_verification", status: "failure" }, 1);
    throw new ApiError(404, "User not found");
  }

  if (user.userVerified) {
    authCounter.inc({ event: "resend_verification", status: "failure" }, 1);
    throw new ApiError(400, "User already verified");
  }

  const { token, hashedToken, tokenExpiry } = generateVerificationToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save();
  await sendMail({
    email,
    subject: "Email Verification",
    mailGenContent: emailVerificationMailGenContent(
      email,
      `${process.env.BASE_URL}/api/auth/verifyEmail/${token}`
    ),
  });

  res.status(200).json(new ApiResponse(200, "Verification email resent"));
  authCounter.inc({ event: "resend_verification", status: "success" }, 1);
});

export const getLoginHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [ipHistory, totalIPs] = await Promise.all([
    UserIP.find({ user: userId }).sort({ loginAt: -1 }).skip(skip).limit(limit),
    UserIP.countDocuments({ user: userId }),
  ]);

  const [deviceHistory, totalDevices] = await Promise.all([
    UserDevice.find({ user: userId })
      .sort({ loginAt: -1 })
      .skip(skip)
      .limit(limit),
    UserDevice.countDocuments({ user: userId }),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Login history fetched", {
      ipHistory,
      deviceHistory,
      pagination: {
        page,
        limit,
        ipPages: Math.ceil(totalIPs / limit),
        devicePages: Math.ceil(totalDevices / limit),
        totalIPEntries: totalIPs,
        totalDeviceEntries: totalDevices,
      },
    })
  );
  authCounter.inc({ event: "login_history", status: "success" }, 1);
});
export const failedLoginAttempts = asyncHandler(async (req, res) => {
  const user = req.user?.email;
  console.log(user);
  if (!user) {
    authCounter.inc({ event: "failed_login_fetch", status: "failure" }, 1);
    throw new ApiError(400, "User email not found");
  }
  const attempts = await FailedLogin.find({ email: user }).sort({
    attemptedAt: -1,
  });
  console.log(attempts);

  res
    .status(200)
    .json(new ApiResponse(200, "Failed login attempts fetched", attempts));
  authCounter.inc({ event: "failed_login_fetch", status: "success" }, 1);
});
export const verifyTokenController = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Missing Authorization header" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Missing token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return res.status(200).json({
      message: "Token verified successfully",
      user: decoded,
    });
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

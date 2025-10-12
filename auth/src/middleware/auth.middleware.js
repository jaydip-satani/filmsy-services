import jwt from "jsonwebtoken";
import { ApiResponse, asyncHandler } from "winston-asynchandler";
import { User } from "../models/user.model.js";

export const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized Access"));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res
      .status(401)
      .json(new ApiResponse(401, "Invalid or expired token"));
  }

  const user = await User.findById(decoded.id).select("id name email role");

  if (!user) {
    return res.status(404).json(new ApiResponse(404, "User not found"));
  }

  req.user = user;
  next();
});

export const checkAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json(new ApiResponse(403, "Admin access only"));
  }
  next();
});

import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler, ApiError, ApiResponse } from "winston-asynchandler";

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    throw new ApiError(400, "All fields are required");

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, "User already exists");

  const user = await User.create({ name, email, password });
  res
    .status(201)
    .json(new ApiResponse(201, "User registered successfully", user));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ApiError(400, "Email and password required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.status(200).json(
    new ApiResponse(200, "Login successful", {
      token,
      user: { id: user._id, name: user.name, email: user.email },
    })
  );
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json(new ApiResponse(200, "User found", user));
});

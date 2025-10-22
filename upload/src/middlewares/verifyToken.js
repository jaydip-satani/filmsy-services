import axios from "axios";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asynchandler.js";

/**
 * Middleware to verify JWT token via Auth Service
 * Adds user info to req.user if verified
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new ApiError(401, "Missing Authorization header");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw new ApiError(401, "Missing token");
  }

  try {
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200 && response.data.user) {
      req.user = response.data.user;
      return next();
    } else {
      throw new ApiError(403, "Invalid token");
    }
  } catch (error) {
    console.error("Token verification failed:", error.message);
    throw new ApiError(403, "Unauthorized");
  }
});

export default verifyToken;

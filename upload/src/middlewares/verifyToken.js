import axios from "axios";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asynchandler.js";

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

    const user = response.data?.user;

    if (response.status === 200 && user) {
      req.user = {
        _id: user._id || user.id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
      };

      return next();
    }

    throw new ApiError(403, "Invalid token");
  } catch (error) {
    console.error("Token verification failed:", error.message);
    throw new ApiError(403, "Unauthorized");
  }
});

export default verifyToken;
``;

import multer from "multer";
import ImageKit from "imagekit";
import { logger } from "../utils/logger.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("video");

const getImageKitInstance = () => {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } =
    process.env;

  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error("Missing ImageKit environment variables");
  }

  return new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
};
const imagekit = getImageKitInstance();

export const uploadVideo = asyncHandler(async (req, res) => {
  await new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  try {
    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/videos",
      useUniqueFileName: true,
    });

    logger.info("Video uploaded to ImageKit", { url: result.url });

    return new ApiResponse(res, 200, {
      message: "File uploaded successfully",
      fileId: result.fileId,
      fileName: result.name,
      url: result.url,
      thumbnail: result.thumbnailUrl,
    });
  } catch (error) {
    logger.error("ImageKit upload error", { error: error.message });
    throw new ApiError(500, "Upload to ImageKit failed");
  }
});

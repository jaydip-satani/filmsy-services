import multer from "multer";
import ImageKit from "imagekit";
import { logger } from "../utils/logger.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import Video from "../models/video.model.js";

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage }).single("video");

// ImageKit instance
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

// Upload Controller
export const uploadVideo = asyncHandler(async (req, res) => {
  await new Promise((resolve, reject) => {
    upload(req, res, (err) =>
      err ? reject(new ApiError(400, "File upload error")) : resolve()
    );
  });

  if (!req.file) throw new ApiError(400, "No file uploaded");
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  try {
    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/videos",
      useUniqueFileName: true,
    });

    const videoData = await Video.create({
      userId: req.user._id,
      fileId: result.fileId,
      fileName: result.name,
      url: result.url,
      thumbnail: result.thumbnailUrl || "",
      size: req.file.size,
      format: req.file.mimetype,
    });

    logger.info("Video uploaded successfully", {
      userId: req.user._id,
      fileId: result.fileId,
      url: result.url,
    });

    // ✅ Simplify frontend handling: send url, id, name
    return res.status(200).json({
      message: "Video uploaded successfully",
      url: result.url,
      id: videoData._id,
      name: result.name,
    });
  } catch (error) {
    logger.error("Video upload failed", { error: error.message });
    throw new ApiError(500, "Upload failed");
  }
});

export const getAllVideos = asyncHandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const videos = await Video.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });

  return res.status(200).json({ videos });
});
export const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.userId.equals(req.user._id)) throw new ApiError(403, "Forbidden");

  return res.status(200).json({ video });
});
export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.userId.equals(req.user._id)) throw new ApiError(403, "Forbidden");

  try {
    if (video.fileId) {
      await imagekit.deleteFile(video.fileId);
    }

    await video.deleteOne();

    logger.info("Video deleted", { userId: req.user._id, videoId: video._id });
    return res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    logger.error("Video deletion failed", { error: error.message });
    throw new ApiError(500, "Failed to delete video");
  }
});

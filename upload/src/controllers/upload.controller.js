import multer from "multer";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { initializeApp } from "firebase/app";
import { logger } from "../utils/logger.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import Video from "../models/video.model.js";

// Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Multer setup
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage }).single("video");

// Helper: upload file to Firebase
const uploadFileToFirebase = async (buffer, fileName) => {
  const fileRef = ref(storage, `videos/${fileName}`);
  await uploadBytes(fileRef, buffer, { contentType: "video/mp4" });
  return getDownloadURL(fileRef);
};

// Upload Video
export const uploadVideo = asyncHandler(async (req, res) => {
  await new Promise((resolve, reject) => {
    upload(req, res, (err) =>
      err ? reject(new ApiError(400, "File upload error")) : resolve()
    );
  });

  if (!req.file) throw new ApiError(400, "No file uploaded");
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  try {
    const fileName = `${Date.now()}_${req.file.originalname}`;
    const url = await uploadFileToFirebase(req.file.buffer, fileName);

    const videoData = await Video.create({
      userId: req.user._id,
      fileName: req.file.originalname,
      url,
      size: req.file.size,
      format: req.file.mimetype,
    });

    logger.info("Video uploaded successfully", {
      userId: req.user._id,
      url,
    });

    return res.status(200).json({
      message: "Video uploaded successfully",
      url,
      id: videoData._id,
      name: req.file.originalname,
    });
  } catch (error) {
    console.log(error);
    logger.error("Video upload failed", { error: error.message });
    throw new ApiError(500, "Upload failed");
  }
});

// Get all videos
export const getAllVideos = asyncHandler(async (req, res) => {
  if (!req.user?._id) throw new ApiError(401, "Unauthorized");

  const videos = await Video.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  return res.status(200).json({ videos });
});

// Get video by ID
export const getVideoById = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.userId.equals(req.user._id)) throw new ApiError(403, "Forbidden");

  return res.status(200).json({ video });
});

// Delete video
export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) throw new ApiError(404, "Video not found");
  if (!video.userId.equals(req.user._id)) throw new ApiError(403, "Forbidden");

  try {
    // Delete from Firebase Storage
    if (video.fileName) {
      const fileRef = ref(storage, `videos/${video.fileName}`);
      await deleteObject(fileRef).catch(() => {}); // ignore if file not found
    }

    await video.deleteOne();
    logger.info("Video deleted", { userId: req.user._id, videoId: video._id });

    return res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    logger.error("Video deletion failed", { error: error.message });
    throw new ApiError(500, "Failed to delete video");
  }
});

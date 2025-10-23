import express from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  uploadVideo,
} from "../controllers/upload.controller.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();

// router.post("/video", verifyToken, uploadVideo);

router.use(verifyToken);

router.post("/upload/video", uploadVideo);
router.get("/videos", getAllVideos);
router.get("/video/:id", getVideoById);
router.delete("/video/:id", deleteVideo);

export default router;

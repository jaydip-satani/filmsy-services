import express from "express";
import { uploadVideo } from "../controllers/upload.controller.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = express.Router();

router.post("/video", verifyToken, uploadVideo);

export default router;

import mongoose from "mongoose";
import UploadVideo from "../models/video.model.js"; // upload-service DB
import TranscodedVideo from "../models/transcode.model.js"; // transcode-service DB
import { processAndUploadVideo } from "../controllers/transcode.controller.js";
import { logger } from "../utils/logger.js";

/**
 * Start polling upload-service DB for new videos
 * interval: time in ms between polling runs
 */
export const startPolling = (interval = 5000) => {
  logger.info("Starting video polling service...");

  setInterval(async () => {
    try {
      // 1. Fetch new uploaded videos from Upload DB
      const uploadVideos = await UploadVideo.find({
        url: { $exists: true, $ne: "" }, // only videos with URL
      }).limit(5); // batch size

      if (!uploadVideos.length) {
        logger.info("No new videos found in upload-service DB");
        return;
      }

      for (const video of uploadVideos) {
        // 2. Check if this video URL already exists in Transcode DB
        const alreadyTranscoded = await TranscodedVideo.findOne({
          url: video.url,
        });
        if (alreadyTranscoded) {
          logger.info(`Skipping already transcoded video: ${video.url}`);
          continue; // skip
        }

        try {
          // 3. Process and save in Transcode DB
          await processAndUploadVideo(video);
          logger.info(`Processed and saved video: ${video.url}`);
        } catch (err) {
          logger.error(`Failed to process video ${video._id}:`, err);
        }
      }
    } catch (err) {
      logger.error("Error while polling upload-service DB:", err);
    }
  }, interval);
};

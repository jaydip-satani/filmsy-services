import path from "path";
import fs from "fs";
import { promises as fsp } from "fs";
import {
  downloadVideo,
  transcodeToMultiQualityHLSSafe,
} from "../utils/ffmpeg.js";
import { uploadHLSFolderToFirebase } from "../utils/fire.js";
import { logger } from "../utils/logger.js";
import TranscodedVideo from "../models/transcode.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const processAndUploadVideo = async (video) => {
  // unique temp folder per download attempt
  const tempDir = path.join(
    "temp",
    video._id.toString(),
    Date.now().toString()
  );

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // 1️⃣ Download video
    const localFile = await downloadVideo(video.url, tempDir);
    logger.info(`Video downloaded: ${localFile}`);

    // 2️⃣ Small delay to ensure streams are fully closed (Windows)
    await new Promise((r) => setTimeout(r, 200));

    // 3️⃣ Transcode to multi-quality HLS
    const { masterPlaylist, allFiles } = await transcodeToMultiQualityHLSSafe(
      localFile,
      tempDir
    );
    logger.info(`Video transcoded: ${masterPlaylist}`);

    // 4️⃣ Upload all HLS files to ImageKit under video-specific folder
    // const uploadedFiles = await uploadHLSFolder(tempDir, video._id.toString());
    const uploadedFiles = await uploadHLSFolderToFirebase(
      tempDir,
      video._id.toString()
    );

    // Map uploaded playlist and chunks
    const playlistFileName = path.basename(masterPlaylist);
    const playlistUrl = uploadedFiles[playlistFileName];

    const chunkUrls = allFiles
      .filter((f) => f.endsWith(".ts") || f.endsWith(".m3u8"))
      .map((f) => uploadedFiles[path.basename(f)])
      .filter(Boolean);

    // 5️⃣ Save transcoded info to DB
    const newTranscoded = new TranscodedVideo({
      userId: video.userId,
      url: video.url,
      fileName: video.fileName,
      transcoded: { playlist: playlistUrl, chunks: chunkUrls },
      status: "processed",
    });

    await newTranscoded.save();
    logger.info(`Transcoded video saved to DB: ${video.url}`);

    // 6️⃣ Cleanup temp folder asynchronously
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
      logger.info(`Temp folder cleaned: ${tempDir}`);
    } catch (cleanupErr) {
      logger.warn(`Failed to clean temp folder: ${cleanupErr.message}`);
    }

    return newTranscoded;
  } catch (err) {
    logger.error(`Failed to process video ${video._id}: ${err.message}`);

    // Update DB to mark failure
    try {
      await TranscodedVideo.findByIdAndUpdate(video._id, {
        status: "failed",
        error: err.message,
      });
    } catch (dbErr) {
      logger.error(
        `Failed to update DB for video ${video._id}: ${dbErr.message}`
      );
    }
  }
};
export const getTranscodedVideo = asyncHandler(async (req, res) => {
  const url = decodeURIComponent(req.params.url);
  const video = await TranscodedVideo.findOne({ url: url });

  if (!video) {
    return res
      .status(404)
      .json(new ApiResponse(false, null, "Transcoded video not found"));
  }

  return res.json(
    new ApiResponse(true, {
      playlist: video.transcoded.playlist,
      chunks: video.transcoded.chunks,
    })
  );
});

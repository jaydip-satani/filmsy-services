import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import axios from "axios";
import { logger } from "./logger.js";

ffmpeg.setFfmpegPath(ffmpegPath);

// ---------------------- Download Video ----------------------
export async function downloadVideo(url, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filename = path.join(outputDir, `video_${Date.now()}.mp4`);
  const writer = fs.createWriteStream(filename);

  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(filename));
      writer.on("error", reject);
    });
  } catch (err) {
    logger.error(`Failed to download video from ${url}:`, err.message);
    throw err;
  }
}

// ---------------------- Transcode Multi-Quality HLS ----------------------
export async function transcodeToMultiQualityHLSSafe(inputFile, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const masterPlaylist = path.join(outputDir, "master.m3u8");

  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .outputOptions([
        "-vf scale=w=1920:h=1080:force_original_aspect_ratio=decrease",
        "-c:a aac",
        "-ar 48000",
        "-b:a 128k",
        "-f hls",
        "-hls_time 10",
        "-hls_list_size 0",
        "-hls_segment_filename",
        path.join(outputDir, "1080p_%03d.ts"),
      ])
      .output(path.join(outputDir, "1080p.m3u8"))
      .on("start", (cmd) => logger.info("FFmpeg started:", cmd))
      .on("end", () => {
        logger.info("Transcoding complete:", masterPlaylist);

        const allFiles = fs
          .readdirSync(outputDir)
          .filter((f) => f.endsWith(".m3u8") || f.endsWith(".ts"))
          .map((f) => path.join(outputDir, f));

        resolve({ masterPlaylist, allFiles });
      })
      .on("error", (err) => {
        logger.error("Transcoding error:", err.message);
        reject(err);
      })
      .run();
  });
}

import ImageKit from "imagekit";
import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Upload a single file
export const uploadFile = async (filePath, fileName) => {
  const fileContent = fs.readFileSync(filePath);

  return new Promise((resolve, reject) => {
    imagekit.upload({ file: fileContent, fileName }, (err, result) => {
      if (err) {
        logger.error("ImageKit upload failed", { fileName, err });
        return reject(err);
      }
      logger.info("Uploaded to ImageKit:", result.url);
      resolve(result.url);
    });
  });
};

/**
 * Upload all HLS files from a folder to ImageKit under a video-specific folder.
 * Supports multi-quality HLS by creating subfolders per variant.
 *
 * @param {string} folderPath - Local folder containing .m3u8 and .ts files
 * @param {string} videoId - Unique video identifier for folder in ImageKit
 * @returns {Promise<Object>} - Map of local filename -> uploaded URL
 */
export const uploadHLSFolder = async (folderPath, videoId) => {
  const files = fs
    .readdirSync(folderPath)
    .filter((f) => f.endsWith(".m3u8") || f.endsWith(".ts"));

  const uploadedFiles = {};

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    let remotePath;

    // Master playlist goes to the root of the video folder
    if (file === "master.m3u8") {
      remotePath = `hls/${videoId}/master.m3u8`;
    } else {
      // Determine variant folder based on playlist name
      const variant = file.startsWith("index_0")
        ? "1080p"
        : file.startsWith("index_1")
        ? "720p"
        : file.startsWith("index_2")
        ? "480p"
        : "other";

      remotePath = `hls/${videoId}/${variant}/${file}`;
    }

    const url = await uploadFile(filePath, remotePath);
    uploadedFiles[file] = url;
  }

  return uploadedFiles;
};

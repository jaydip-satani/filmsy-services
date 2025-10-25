import fs from "fs";
import path from "path";
import { bucket } from "./firebase.js";
import { logger } from "./logger.js";

export const uploadFileToFirebase = async (localPath, remotePath) => {
  await bucket.upload(localPath, {
    destination: remotePath,
    public: true,
  });

  const file = bucket.file(remotePath);
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  logger.info(`Uploaded to Firebase: ${publicUrl}`);
  return publicUrl;
};

// Upload all HLS files in a folder
export const uploadHLSFolderToFirebase = async (folderPath, videoId) => {
  const files = fs
    .readdirSync(folderPath)
    .filter((f) => f.endsWith(".m3u8") || f.endsWith(".ts"));
  const uploadedFiles = {};

  for (const file of files) {
    const localPath = path.join(folderPath, file);
    let remotePath;

    if (file === "master.m3u8") {
      remotePath = `hls/${videoId}/master.m3u8`;
    } else {
      const variant = file.startsWith("index_0")
        ? "1080p"
        : file.startsWith("index_1")
        ? "720p"
        : file.startsWith("index_2")
        ? "480p"
        : "other";

      remotePath = `hls/${videoId}/${variant}/${file}`;
    }

    const url = await uploadFileToFirebase(localPath, remotePath);
    uploadedFiles[file] = url;
  }

  return uploadedFiles;
};

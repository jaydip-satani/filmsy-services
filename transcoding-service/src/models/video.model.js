import mongoose from "mongoose";
import { uploadDB } from "../utils/db.js";

const videoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileId: { type: String, required: true },
    fileName: String,
    url: String,
    thumbnail: String,
    size: Number,
    format: String,
    duration: Number,
    title: String,
    description: String,
  },
  { timestamps: true }
);

export default uploadDB.model("Video", videoSchema);

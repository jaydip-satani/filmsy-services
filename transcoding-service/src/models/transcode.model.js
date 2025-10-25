import mongoose from "mongoose";
import { transcodeDB } from "../utils/db.js";

const transcodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    url: { type: String, required: true },
    fileName: String,
    transcoded: {
      playlist: String,
      chunks: [String],
    },
  },
  { timestamps: true }
);

export default transcodeDB.model("TranscodedVideo", transcodeSchema);

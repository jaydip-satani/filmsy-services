import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    fileId: {
      type: String,
      required: true,
    },
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

export default mongoose.model("Video", videoSchema);

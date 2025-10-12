import mongoose from "mongoose";

const FailedLoginSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  email: { type: String },
  ip: { type: String },
  device: { type: JSON },
  reason: { type: String },
  attemptedAt: { type: Date, default: Date.now },
});

export default mongoose.model("FailedLogin", FailedLoginSchema);

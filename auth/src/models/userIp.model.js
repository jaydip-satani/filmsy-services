import mongoose from "mongoose";

const UserIPSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ip: { type: String, required: true },
    loginAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const UserIP = mongoose.model("UserIP", UserIPSchema);
export default UserIP;

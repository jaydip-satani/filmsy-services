import mongoose from "mongoose";

const UserDeviceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceData: { type: JSON, required: true },
    loginAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const UserDevice = mongoose.model("UserDevice", UserDeviceSchema);
export default UserDevice;

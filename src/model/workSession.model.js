import mongoose from "mongoose";

const workSessionSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

        site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    clockIn: {
      type: Date,
      required: true,
    },

    clockOut: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number, // minutes
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("WorkSession", workSessionSchema);
import mongoose from "mongoose";
const jobSchema = new mongoose.Schema(
  {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    site_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
        required: true,
      },
    ],
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "active", "complete","approved","rejected"],
      default: "pending",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
 attendance: {
      punchIn: {
        time: { type: Date, default: null },
        images: [{ type: String }],
      },

      punchOut: {
        time: { type: Date, default: null },
        images: [{ type: String }],
      },

      duration: {
        type: Number, // minutes
        default: null,
      },
    },
    devicesUsed: {
      type: String,
      default: null,
    },
    beforePhoto: [
      {
        type: String,
      },
    ],
    afterPhoto: [
      {
        type: String,
      },
    ],
    latitude: {
      type: String,
      default: null,
    },
    longitude: {
      type: String,
      default: null,
    },
    
  },

  { timestamps: true },
);

export default mongoose.model("Job", jobSchema);

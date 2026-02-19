import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
  changeJobStatus,
  getJobGraph,
  getMemberJobGraph,
  getTeamActivity,
  punchInJob,
  punchOutJob,
  updateJobNotes,
  addAfterAttachments,
  removeAttachment
} from "../controller/job.controller.js";

const router = express.Router();
router.get("/graph", getJobGraph);
router.get("/member-graph", getMemberJobGraph);
router.get("/team/activity", getTeamActivity);

router.post("/", protect, authorize("client", "super_admin"), createJob);
router.get("/", getAllJobs);
router.get("/:id", getJobById);
// router.put("/:id", updateJob);
router.put(
  "/:id",
  upload.fields([
    { name: "afterPhoto", maxCount: 5 },
    { name: "beofePhoto", maxCount: 5 },
  ]),
  updateJob,
);
router.delete("/:id", deleteJob);
router.patch("/:id/status", changeJobStatus);

// 🔹 Punch In
router.patch(
  "/:jobId/punch-in",
  upload.fields([{ name: "images", maxCount: 5 }]),
  punchInJob,
);

// 🔹 Punch Out
router.patch(
  "/:jobId/punch-out",

  upload.fields([{ name: "images", maxCount: 5 }]),
  punchOutJob,
);

// 🔹 Update Notes
router.patch("/:jobId/notes", updateJobNotes);

router.patch(
  "/:jobId/after-attachments",
  upload.array("images", 20),
  addAfterAttachments
);

router.patch("/:jobId/remove-attachment", removeAttachment);


// 🔹 Upload Images (before / after)
// Query param: ?type=before  OR  ?type=after
// router.patch("/:jobId/upload-images", upload, uploadJobImages);

export default router;

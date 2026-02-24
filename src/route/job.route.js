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
  removeAttachment,getAllJobsInOrder
  ,getJobsByMemberOrClient,
  getDashboardData,getAllActivePunchedInJobs
} from "../controller/job.controller.js";

const router = express.Router();
router.get("/active",protect, getAllActivePunchedInJobs);

router.get("/graph",protect, getJobGraph);
router.get("/member-graph",protect, getMemberJobGraph);
router.get("/team/activity",protect, getTeamActivity);

router.post("/", protect, createJob);
router.get("/",protect, getAllJobs);
router.get("/allJobs",protect, getAllJobsInOrder);
router.get("/by-user",protect, getJobsByMemberOrClient);

router.get("/:id",protect, getJobById);
// router.put("/:id", updateJob);
router.put(
  "/:id",protect,
  upload.fields([
    { name: "afterPhoto", maxCount: 5 },
    { name: "beofePhoto", maxCount: 5 },
  ]),
  updateJob,
);
router.delete("/:id",protect, deleteJob);
router.patch("/:id/status",protect, changeJobStatus);

// 🔹 Punch In
router.patch(
  "/:jobId/punch-in",
  protect,
  upload.fields([{ name: "images", maxCount: 5 }]),
  punchInJob,
);

// 🔹 Punch Out
router.patch(
  "/:jobId/punch-out",
  protect,
  upload.fields([{ name: "images", maxCount: 5 }]),
  punchOutJob,
);

// 🔹 Update Notes
router.patch("/:jobId/notes",protect, updateJobNotes);

router.patch(
  "/:jobId/after-attachments",
  protect,
  upload.array("images", 20),
  addAfterAttachments
);

router.patch("/:jobId/remove-attachment",protect, removeAttachment);

router.get("/analytics/graph",protect, getDashboardData);



// 🔹 Upload Images (before / after)
// Query param: ?type=before  OR  ?type=after
// router.patch("/:jobId/upload-images", upload, uploadJobImages);

export default router;

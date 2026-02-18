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
  getTeamActivity
} from "../controller/job.controller.js";

const router = express.Router();
router.get("/graph", getJobGraph);
router.get("/member-graph", getMemberJobGraph);
router.get("/team/activity", getTeamActivity);

router.post("/",protect,authorize("client", "super_admin"), createJob);
router.get("/", getAllJobs);
router.get("/:id", getJobById);
// router.put("/:id", updateJob);
router.put(
  "/:id",
  upload.fields([
    { name: "afterPhoto", maxCount: 5 },
    { name: "beofePhoto", maxCount: 5 },
  ]),
  updateJob
);
router.delete("/:id", deleteJob);
router.patch("/:id/status", changeJobStatus);


export default router;

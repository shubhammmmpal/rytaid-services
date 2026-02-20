import express from "express";
import { protect, authorize } from '../middleware/authMiddleware.js';

import {
  createSite,
  getSites,
  updateSite,
  deleteSite,
  changeSiteStatus,
  getSiteById,
  getAllSiteList,
  getSiteGraph,
  changeTaskStatus,
} from "../controller/site.controller.js";

const router = express.Router();

router.get("/graph", getSiteGraph);

router.post("/",protect, createSite);                // Create
router.get("/",protect, getSites);                   // Get with search & filters
router.get("/sites",protect, getAllSiteList); 
router.get("/:id",protect, getSiteById);
router.put("/:id",protect, authorize("client","super_admin"), updateSite);              // Edit
router.delete("/:id",protect, authorize("client","super_admin"), deleteSite);            // Delete
router.patch("/:id/status",protect, authorize("client","super_admin"), changeSiteStatus); // Change status
router.patch('/:siteId/tasks-status',changeTaskStatus )
export default router;

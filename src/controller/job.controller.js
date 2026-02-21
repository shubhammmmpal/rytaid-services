import  Job  from "../model/job.model.js";
import imagekit from "../services/imagekit.js";
import Member from "../model/member.model.js";
import {Client }from "../model/client.model.js";

/* ================= CREATE JOB ================= */
export const createJob = async (req, res) => {
  try {
    const {
      assignedTo,
      site_id,
      client,
      notes,
      startDate,
      endDate,
      startTime,
      endTime,
    } = req.body;

    const job = await Job.create({
      assignedTo,
      site_id,
      client,
      notes,
      startDate,
      endDate,
      startTime,
      endTime,
    });

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create job",
      error: error.message,
    });
  }
};

// /* ================= GET ALL JOBS (FILTER + PAGINATION) ================= */
// export const getAllJobs = async (req, res) => {
//   try {
//     const {
//       search,
//       status,
//       assignedTo,
//       client,
//       site_id,
//       startDate,
//       endDate,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     const filter = {};

//     // 🎯 Filters
//     if (status) filter.status = status;
//     if (assignedTo) filter.assignedTo = assignedTo;
//     if (client) filter.client = client;
//     if (site_id) filter.site_id = site_id;

//     // 📅 Date range filter
//     if (startDate || endDate) {
//       filter.startDate = {};
//       if (startDate) filter.startDate.$gte = new Date(startDate);
//       if (endDate) filter.startDate.$lte = new Date(endDate);
//     }

//     // 🔍 Notes search
//     if (search) {
//       filter.notes = { $regex: search, $options: "i" };
//     }

//     const jobs = await Job.find(filter)
//       .populate("assignedTo", "firstName lastName email")
//       .populate("client", "companyInfo email")
//       .populate("site_id", "site_id site_name")
//       .skip((page - 1) * limit)
//       .limit(Number(limit))
//       .sort({ createdAt: -1 });

//     const total = await Job.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       total,
//       page: Number(page),
//       limit: Number(limit),
//       data: jobs,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const getAllJobs = async (req, res) => {
  try {
    const {
      search,
      status,
      assignedTo,
      client,
      site_id,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    // Basic filters
    if (status)       filter.status     = status;
    if (assignedTo)   filter.assignedTo = assignedTo;
    if (client)       filter.client     = client;
    if (site_id)      filter.site_id    = site_id;

    // Date range filter (on startDate field)
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate)   filter.startDate.$lte = new Date(endDate);
    }

    // Search in notes
    if (search) {
      filter.notes = { $regex: search, $options: "i" };
    }

    // Fetch ALL matching jobs (no pagination)
    const jobs = await Job.find(filter)
      .populate("assignedTo", "firstName lastName email")
      .populate("client", "companyInfo email")
      .populate("site_id", "site_id site_name")
      .sort({ createdAt: -1 })   // or change to { startDate: -1, createdAt: -1 }
      .lean();                   // faster + easier to work with plain objects

    // ────────────────────────────────────────────────
    // Group by startDate (YYYY-MM-DD)
    // ────────────────────────────────────────────────
    const grouped = {};

    for (const job of jobs) {
      // Use startDate instead of createdAt
      const dateStr = job.startDate
        ? new Date(job.startDate).toISOString().split("T")[0]
        : "no-start-date"; // fallback for jobs without startDate

      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(job);
    }

    // Convert to array + sort groups by date descending
    const groupedArray = Object.entries(grouped)
      .map(([date, jobs]) => ({ date, jobs }))
      .sort((a, b) => b.date.localeCompare(a.date)); // newest → oldest

    res.status(200).json({
      success: true,
      total: jobs.length,
      data: groupedArray,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getAllJobsInOrder = async (req, res) => {
  try {
    const {
      status,
      assignedTo,
      client,
      site_id,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sort = "-createdAt", // newest first by default
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (client) {
      filter.client = client;
    }

    if (site_id) {
      filter.site_id = { $in: [site_id] }; // since site_id is array
    }

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate)   filter.startDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const perPage = Number(limit);

    // Execute query with population
    const jobs = await Job.find(filter)
      .populate({
        path: "assignedTo",
        select: "firstName lastName email phone profileImg totalworkinghours completedJobsCount",
      })
      .populate({
        path: "client",
        select: "companyInfo.companyName companyInfo.companyEmail individualInfo.firstName individualInfo.lastName workinghours completedJobsCount",
      })
      .populate({
        path: "site_id",
        select: "name address", // adjust fields based on your Site model
      })
      .sort(sort)
      .skip(skip)
      .limit(perPage);

    // Get total count for pagination info
    const totalJobs = await Job.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total: totalJobs,
      totalPages: Math.ceil(totalJobs / perPage),
      currentPage: Number(page),
      data: jobs,
    });
  } catch (error) {
    console.error("Get all jobs error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching jobs",
      error: error.message,
    });
  }
};
/* ================= GET JOB BY ID ================= */
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id)
      .populate("assignedTo", "firstName lastName email")
      .populate("client", "companyInfo email")
      .populate("site_id", "site_id site_name");

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    res.status(200).json({
      message: "Job fetched successfully",
      data: job,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid job id" });
    }

    res.status(500).json({
      message: "Failed to fetch job",
      error: error.message,
    });
  }
};



/* ================= UPDATE JOB ================= */

export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    console.log(req.params)

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // 🔥 Upload BEFORE Photos
    if (req.files?.beofePhoto) {
      const beforeUrls = [];

      for (let file of req.files.beofePhoto) {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: Date.now() + "-" + file.originalname,
          folder: "/jobs/before",
        });

        beforeUrls.push(result.url);
      }

      job.beofePhoto = beforeUrls;
    }

    // 🔥 Upload AFTER Photos
    if (req.files?.afterPhoto) {
      const afterUrls = [];

      for (let file of req.files.afterPhoto) {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: Date.now() + "-" + file.originalname,
          folder: "/jobs/after",
        });

        afterUrls.push(result.url);
      }

      job.afterPhoto = afterUrls;
    }

    // Other updates
    Object.assign(job, req.body);

    await job.save();

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: job,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= DELETE JOB ================= */
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByIdAndDelete(id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    res.status(200).json({
      message: "Job deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete job",
      error: error.message,
    });
  }
};

/* ================= CHANGE JOB STATUS ================= */
export const changeJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    res.status(200).json({
      message: "Job status updated successfully",
      data: job,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to change job status",
      error: error.message,
    });
  }
};


export const getJobGraph = async (req, res) => {
  try {
    const { filter } = req.query; 
    // filter = day | week | month
    // default = month

    const now = new Date();
    let matchStage = {};
    let groupStage = {};
    let startDate;

    // 🔹 DEFAULT → LAST 1 MONTH (4 WEEKS)
   if (!filter || filter === "month") {
  startDate = new Date();
  startDate.setDate(now.getDate() - 28);

  matchStage = {
    createdAt: { $gte: startDate }
  };

  groupStage = {
    _id: {
      year: { $year: "$createdAt" },
      week: { $isoWeek: "$createdAt" }
    },
    totalJobs: { $sum: 1 }
  };
}


    // 🔹 DAY WISE (Last 7 Days)
    if (filter === "day") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);

      matchStage = {
        createdAt: { $gte: startDate }
      };

      groupStage = {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        totalJobs: { $sum: 1 }
      };
    }

    // 🔹 WEEK WISE (Last 8 Weeks)
   if (filter === "week") {
  startDate = new Date();
  startDate.setDate(now.getDate() - 56);

  matchStage = {
    createdAt: { $gte: startDate }
  };

  groupStage = {
    _id: {
      year: { $year: "$createdAt" },
      week: { $isoWeek: "$createdAt" }
    },
    totalJobs: { $sum: 1 }
  };
}


    const jobs = await Job.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      filter: filter || "month",
      data: jobs
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



export const getMemberJobGraph = async (req, res) => {
  try {
    const { filter, memberId } = req.query;

    const now = new Date();
    let startDate;
    let dateFormat;

    // 🔹 Default → Last 4 Weeks
    if (!filter || filter === "month") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 28);
      dateFormat = "%Y-W%U"; // Year-Week
    }

    // 🔹 Day Wise → Last 7 Days
    if (filter === "day") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      dateFormat = "%Y-%m-%d";
    }

    // 🔹 Week Wise → Last 8 Weeks
    if (filter === "week") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 56);
      dateFormat = "%Y-W%U";
    }

    // 🔥 Match Condition
    const matchStage = {
      createdAt: { $gte: startDate }
    };

    // Optional Member Filter
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) {
      matchStage.assignedTo = new mongoose.Types.ObjectId(memberId);
    }

    const jobs = await Job.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: "$createdAt"
            }
          },
          totalJobs: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      filter: filter || "month",
      data: jobs
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const getTeamActivity = async (req, res) => {
  try {
    const { filter } = req.query;

    const now = new Date();
    let startDate;

    // Default → Last 4 weeks
    if (!filter || filter === "month") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 28);
    }

    if (filter === "day") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
    }

    if (filter === "week") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 56);
    }

const activity = await Job.aggregate([
  {
    $match: {
      createdAt: { $gte: startDate }
    }
  },
  {
    $group: {
      _id: "$assignedTo",
      totalJobs: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "members",
      localField: "_id",
      foreignField: "_id",
      as: "member"
    }
  },
  {
    $unwind: {
      path: "$member",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      name: {
        $ifNull: [
          { $concat: ["$member.firstName", " ", "$member.lastName"] },
          "Unknown Member"
        ]
      },
      totalJobs: 1
    }
  },
  { $sort: { totalJobs: -1 } }
]);


    res.status(200).json({
      success: true,
      data: activity
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};




export const punchInJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    // const { notes } = req.body;   // ← uncomment if you want to use notes later

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.attendance?.punchIn?.time) {
      return res.status(400).json({ message: "Already punched in" });
    }

    // Optional: only allow punch-in if job is in a valid state
    if (job.status === "complete") {
      return res.status(400).json({ message: "Cannot punch in — job is already complete" });
    }

    const uploadedImages = [];

    // Upload Images if provided
    if (req.files && req.files.images) {
      // Handle case when only one file is uploaded (some multer setups wrap single file differently)
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

      for (const file of files) {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: file.originalname,
        });
        uploadedImages.push(result.url);
      }
    }

    // ── Main changes ───────────────────────────────────────
    job.status = "active";                    // ← Set to active on punch-in
    job.attendance.punchIn.time = new Date();
    job.attendance.punchIn.images = uploadedImages;

    // if (notes) {
    //   job.notes = notes;   // or job.notes += `\n${notes}` if appending
    // }

    await job.save();

    res.status(200).json({
      message: "Punch In successful – job is now active",
      status: job.status,
      imagesUploaded: uploadedImages.length,
      punchInTime: job.attendance.punchIn.time,
    });

  } catch (error) {
    console.error("Punch-in error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




export const punchOutJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (!job.attendance?.punchIn?.time) {
      return res.status(400).json({ message: "Must punch in first" });
    }

    // if (job.attendance?.punchOut?.time) {
    //   return res.status(400).json({ message: "Already punched out" });
    // }

    const punchOutTime = new Date();
    const diffMs = punchOutTime.getTime() - job.attendance.punchIn.time.getTime();
    const durationMinutes = Math.floor(diffMs / (1000 * 60));

    if (durationMinutes <= 0) {
      return res.status(400).json({ message: "Invalid duration (punch-out too soon)" });
    }

    const durationHours = durationMinutes / 60;

    // ── Prepare image upload ─────────────────────────────────────
    const uploadedImages = [];
    if (req.files?.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      for (const file of files) {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: file.originalname,
        });
        uploadedImages.push(result.url);
      }
    }

    // ── Update the Job document ──────────────────────────────────
    job.attendance.punchOut.time   = punchOutTime;
    job.attendance.punchOut.images = uploadedImages;
    job.attendance.duration        = durationMinutes;
    job.status                     = "complete";

    await job.save();

    // ── Atomic increments for counters & hours (safe & concurrent-proof) ──

    // 1. Update assigned Member
    const updatedMember = await Member.findByIdAndUpdate(
      job.assignedTo,
      {
        $inc: {
          totalworkinghours:   durationHours,
          completedJobsCount:  1
        }
      },
      { new: true, select: "totalworkinghours completedJobsCount" }
    );

    // 2. Update assigned Client
    const updatedClient = await Client.findByIdAndUpdate(
      job.client,
      {
        $inc: {
          workinghours:        durationHours,
          completedJobsCount:  1
        }
      },
      { new: true, select: "workinghours completedJobsCount" }
    );

    res.status(200).json({
      message: "Punch-out successful – job completed, counters & hours updated",
      jobId: job._id,
      status: job.status,
      duration: {
        minutes: durationMinutes,
        hours: Number(durationHours.toFixed(2)),
      },
      member: {
        id: job.assignedTo,
        totalworkinghours:   updatedMember ? Number(updatedMember.totalworkinghours.toFixed(2)) : null,
        completedJobsCount: updatedMember?.completedJobsCount || 0,
      },
      client: {
        id: job.client,
        workinghours:        updatedClient ? Number(updatedClient.workinghours.toFixed(2)) : null,
        completedJobsCount: updatedClient?.completedJobsCount || 0,
      },
      imagesUploaded: uploadedImages.length,
    });

  } catch (error) {
    console.error("Punch-out error:", error);
    res.status(500).json({
      message: "Server error during punch-out",
      error: error.message,
    });
  }
};




export const updateJobNotes = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { notes } = req.body;

    if (!notes || notes.trim() === "") {
      return res.status(400).json({
        message: "Notes cannot be empty",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    job.notes = notes;
    await job.save();

    res.status(200).json({
      message: "Notes updated successfully",
      notes: job.notes,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};




export const addAfterAttachments = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No images uploaded",
      });
    }

    const uploadedImages = [];

    // 🔥 Upload to ImageKit
    for (const file of req.files) {
      const result = await imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
      });

      uploadedImages.push(result.url);
    }

    // 🔥 Append (not replace)
    job.afterPhoto.push(...uploadedImages);

    await job.save();

    res.status(200).json({
      message: "Images added successfully",
      added: uploadedImages.length,
      totalImages: job.afterPhoto.length,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


export const removeAttachment = async (req, res) => {
  console.log("hkahkhsksk")
  try {
    const { jobId } = req.params;
    const { imageName } = req.body; // yaha full URL aayega

    console.log(req.params.jobId)
    console.log(imageName)

    if (!imageName) {
      return res.status(400).json({
        message: "imageName (full URL) is required",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    // 🔥 Check image exists
    if (!job.afterPhoto.includes(imageName)) {
      return res.status(400).json({
        message: "Image not found in afterPhoto array",
      });
    }

    // 🔥 Remove exact URL match
    job.afterPhoto = job.afterPhoto.filter(
      (url) => url !== imageName
    );

    await job.save();

    res.status(200).json({
      message: "Attachment removed successfully",
      totalImages: job.afterPhoto.length,
      afterPhoto: job.afterPhoto,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};




export const getJobsByMemberOrClient = async (req, res) => {
  try {
    const {
      memberId,
      clientId,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    // At least one filter is required
    if (!memberId && !clientId) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one of: memberId or clientId",
      });
    }

    // Build the query filter
    const filter = {};

    if (memberId && clientId) {
      // Both provided → jobs for this member AND this client (intersection)
      filter.$and = [
        { assignedTo: memberId },
        { client: clientId },
      ];
    } else if (memberId) {
      filter.assignedTo = memberId;
    } else if (clientId) {
      filter.client = clientId;
    }

    if (status) {
      filter.status = status;
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const perPage = Number(limit);

    // Fetch jobs - sorted by updatedAt descending (most recently modified first)
    const jobs = await Job.find(filter)
      .populate({
        path: "assignedTo",
        select: "firstName lastName email phone profileImg totalworkinghours completedJobsCount",
      })
      .populate({
        path: "client",
        select: "companyInfo.companyName individualInfo.firstName individualInfo.lastName workinghours completedJobsCount",
      })
      .populate({
        path: "site_id",
        select: "name address", // adjust based on your Site model
      })
      .sort({ updatedAt: -1 })           // ← MOST RECENTLY MODIFIED FIRST
      .skip(skip)
      .limit(perPage);

    const total = await Job.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      totalPages: Math.ceil(total / perPage),
      currentPage: Number(page),
      data: jobs,
    });
  } catch (error) {
    console.error("Get jobs by user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching jobs",
      error: error.message,
    });
  }
};




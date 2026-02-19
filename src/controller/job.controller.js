import  Job  from "../model/job.model.js";
import imagekit from "../services/imagekit.js";

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

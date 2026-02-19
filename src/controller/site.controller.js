import Site  from "../model/site.model.js";


/* ================= CREATE SITE ================= */
export const createSite = async (req, res) => {
  try {
    const lastSite = await Site.findOne().sort({ site_id: -1 });

    const nextSiteId = lastSite ? lastSite.site_id + 1 : 1;

    const site = await Site.create({
      ...req.body,
      site_id: nextSiteId,
    });

    res.status(201).json({
      message: "Site created successfully",
      data: site,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to create site",
      error: error.message,
    });
  }
};


/* ================= GET SITES (SEARCH + FILTER) ================= */
// export const getSites = async (req, res) => {
//   try {
//     const {
//       search = "",
//       status = "all",
//       city_id,
//       state_id,
//       client_id,
// sort = "newest",
//       startDate,
//       endDate,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     const filter = {};

//     // -------------------------
//     // 1️⃣ Status filter
//     // -------------------------
//     if (status && status !== "all") {
//       filter.status = status;
//     }

//     // -------------------------
//     // 2️⃣ Search filter (DB level)
//     // -------------------------
//     if (search.trim()) {
//       const searchRegex = new RegExp(search.trim(), "i");
//       filter.$or = [
//         { site_name: searchRegex },
//         { address1: searchRegex },
//         { address2: searchRegex },
//         { notes: searchRegex },
//       ];
//     }

//     // -------------------------
//     // 3️⃣ Direct ID filters
//     // -------------------------
//     if (city_id) filter.city_id = city_id;
//     if (state_id) filter.state_id = state_id;
//     if (client_id) filter.client_id = client_id;

//     // -------------------------
//     // 4️⃣ Date range filter
//     // -------------------------
//     if (startDate || endDate) {
//       filter.createdAt = {};

//       if (startDate) {
//         const start = new Date(startDate);
//         start.setHours(0, 0, 0, 0);
//         filter.createdAt.$gte = start;
//       }

//       if (endDate) {
//         const end = new Date(endDate);
//         end.setHours(23, 59, 59, 999);
//         filter.createdAt.$lte = end;
//       }
//     }

//     // -------------------------
//     // 5️⃣ Sorting (NEWEST DEFAULT)
//     // -------------------------
//     let sortOption = { createdAt: -1 }; // ✅ default newest

// if (sort === "az") {
//   sortOption = { site_name: 1 };
// } 
// else if (sort === "za") {
//   sortOption = { site_name: -1 };
// } 
// else if (sort === "oldest") {
//   sortOption = { createdAt: 1 };
// }


//     // -------------------------
//     // 6️⃣ Pagination
//     // -------------------------
//     const pageNum = parseInt(page, 10) || 1;
//     const limitNum = parseInt(limit, 10) || 10;
//     const skip = (pageNum - 1) * limitNum;

//     // -------------------------
//     // 7️⃣ Execute Query
//     // -------------------------
//     const [sites, total] = await Promise.all([
//       Site.find(filter)
//         .collation({ locale: "en", strength: 2 })
//         .populate({
//           path: "client_id",
//           select: "companyInfo.companyName companyInfo.companyEmail",
//         })
//         .populate("city_id")
//         .populate("state_id")
//         .populate("country_id")
//         .populate("pincode_id")
//         .populate("assignedTo", "firstName lastName email")
//         .sort(sortOption)
//         .skip(skip)
//         .limit(limitNum)
//         .exec(),
//       Site.countDocuments(filter),
//     ]);

//     // -------------------------
//     // 8️⃣ Response
//     // -------------------------
//     res.json({
//       success: true,
//       total,
//       page: pageNum,
//       limit: limitNum,
//       totalPages: Math.ceil(total / limitNum),
//       data: sites,
//     });
//   } catch (error) {
//     console.error("Error in getSites:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch sites",
//       error: error.message,
//     });
//   }
// };



export const getSites = async (req, res) => {
  try {
    const {
      search = "",
      status = "all",           // "pending" | "approved" | "rejected" | "all"
      city_id,
      state_id,
      client_id,
      sort = "newest",          // "az" | "za" | "newest" | "oldest"
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // 1. Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // 2. Search filter (basic fields)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { site_name: searchRegex },
        { address1: searchRegex },
        { address2: searchRegex },
        { notes: searchRegex },
      ];
    }

    // 3. Direct ID filters
    if (city_id)   filter.city_id   = city_id;
    if (state_id)  filter.state_id  = state_id;
    if (client_id) filter.client_id = client_id;   // Note: client_id is an array in model

    // 4. Date range filter (createdAt)
    // Works even without timestamps: true if you manually added createdAt field
    // If you don't have createdAt, remove this block or add timestamps: true to schema
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // 5. Sorting
    let sortOption = { _id: -1 }; // default: newest first (assuming _id is incremental)

    if (sort === "az") {
      sortOption = { site_name: 1 };
    } else if (sort === "za") {
      sortOption = { site_name: -1 };
    } else if (sort === "oldest") {
      sortOption = { _id: 1 };
    }

    // 6. Pagination
    const pageNum  = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip     = (pageNum - 1) * limitNum;

    // Build query
    // const sitesQuery = Site.find(filter)
    //   .populate({
    //     path: "client_id",
    //     select: "companyInfo.companyName companyInfo.companyEmail",
    //   })
    //   .populate("city_id", "city_name")
    //   .populate("state_id", "state_name")
    //   .populate("country_id", "name")
    //   .populate("pincode_id", "pincode_name")
    //   .populate("assignedTo", "firstName lastName email")
    //   .sort(sortOption)
    //   .skip(skip)
    //   .limit(limitNum);

    // Execute both data + count in parallel
    // const [sites, total] = await Promise.all([
    //   sitesQuery.exec(),
    //   Site.countDocuments(filter),
    // ]);

    // Optional: extra client-side filtering for populated fields
    // (MongoDB $regex on populated fields requires aggregation or this post-filter)
    // let finalSites = sites;

    // if (search.trim()) {
    //   const searchRegex = new RegExp(search.trim(), "i");
    //   finalSites = sites.filter((site) => {
    //     const clientNames = site.client_id
    //       ?.map((c) => c?.companyInfo?.companyName || "")
    //       .join(" ") || "";

    //     const cityName = site.city_id?.city_name || "";

    //     return (
    //       searchRegex.test(site.site_name || "") ||
    //       searchRegex.test(site.address1 || "") ||
    //       searchRegex.test(site.address2 || "") ||
    //       searchRegex.test(site.notes || "") ||
    //       searchRegex.test(clientNames) ||
    //       searchRegex.test(cityName)
    //     );
    //   });
    // }

    const [sites, total] = await Promise.all([
      Site.find(filter)
        .collation({ locale: "en", strength: 2 })
        .populate({
          path: "client_id",
          select: "companyInfo.companyName companyInfo.companyEmail",
        })
        .populate("city_id")
        .populate("state_id")
        .populate("country_id")
        .populate("pincode_id")
        .populate("assignedTo", "firstName lastName email")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .exec(),
      Site.countDocuments(filter),
    ]);

    // res.json({
    //   success: true,
    //   total,
    //   page: pageNum,
    //   limit: limitNum,
    //   totalPages: Math.ceil(total / limitNum),
    //   data: finalSites,
    // });

   res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: sites,
    });
  } catch (error) {
    console.error("Error in getSites:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sites",
      error: error.message,
    });
  }
};

export const getAllSiteList = async (req, res)=>{
try {
    const clients = await Site.find({})
        .select("_id site_name");
  
      const formatted = clients.map((site) => ({
        _id: site._id,
        name: site.site_name,
        
      }));
  
      res.json(formatted);
}
catch(error){
res.status(500).json({
  message: "Failed to fetch sites",
  error:error.message
})
}
}

/* ================= UPDATE SITE ================= */
export const updateSite = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await Site.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.json({
      message: "Site updated successfully",
      data: site,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update site",
      error: error.message,
    });
  }
};

/* ================= DELETE SITE ================= */
export const deleteSite = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await Site.findByIdAndDelete(id);

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.json({
      message: "Site deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete site",
      error: error.message,
    });
  }
};

/* ================= CHANGE STATUS ================= */
export const changeSiteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const site = await Site.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.json({
      message: "Status updated successfully",
      data: site,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to change status",
      error: error.message,
    });
  }
};

/* ================= GET SITE BY ID ================= */


export const getSiteById = async (req, res) => {
  try {
    const { id } = req.params;

    const site = await Site.findById(id)
      .populate("client_id", "companyInfo.companyName email")
      .populate("assignedTo", "email firstName lastName")
      .populate("country_id", "name code countryId")
      .populate("state_id", "state_name country_id state_id")
      .populate("city_id", "city_name city_id state_id")
      .populate("pincode_id")

    if (!site) {
      return res.status(404).json({
        message: "Site not found",
      });
    }

    res.status(200).json({
      message: "Site fetched successfully",
      data: site,
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid site id",
      });
    }

    res.status(500).json({
      message: "Failed to fetch site",
      error: error.message,
    });
  }
};


export const getSiteGraph = async (req, res) => {
  try {
    const { filter } = req.query;
    const now = new Date();
    let startDate;
    let groupFormat;

    // 🔹 DEFAULT → Last 4 Weeks
    if (!filter || filter === "month") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 28);

      groupFormat = "%Y-W%U"; // Year-Week
    }

    // 🔹 Day Wise → Last 7 Days
    if (filter === "day") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);

      groupFormat = "%Y-%m-%d";
    }

    // 🔹 Week Wise → Last 8 Weeks
    if (filter === "week") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 56);

      groupFormat = "%Y-W%U";
    }

    const sites = await Site.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: "$createdAt"
            }
          },
          totalSites: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      filter: filter || "month",
      data: sites
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

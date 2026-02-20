import { User } from "../model/user.model.js";
import { Client } from "../model/client.model.js";
import jwt from "jsonwebtoken";
import Invite from "../model/invite.model.js";
import crypto from "crypto";
import Member from "../model/member.model.js";
import mongoose from "mongoose";
import imagekit from "../services/imagekit.js";
import { sendEmail } from "../services/sendEmail.js";
import { count } from "console";

// 🔑 Generate Token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const createClient = async (req, res) => {
  try {
    
    let companyImg = null;
    let individualImg = null;

    // 🔥 Upload Company Image
    if (req.files?.companyImg?.[0]) {
      const uploadCompany = await imagekit.upload({
        file: req.files.companyImg[0].buffer,
        fileName: Date.now() + "-" + req.files.companyImg[0].originalname,
        folder: "/clients",
      });

      companyImg = uploadCompany.url;
    }

    // 🔥 Upload Individual Image
    if (req.files?.individualImg?.[0]) {
      const uploadIndividual = await imagekit.upload({
        file: req.files.individualImg[0].buffer,
        fileName: Date.now() + "-" + req.files.individualImg[0].originalname,
        folder: "/clients",
      });

      individualImg = uploadIndividual.url;
    }

    const client = await Client.create({
      companyInfo: {
        ...req.body,
        img: companyImg,
      },
      individualInfo: {
        ...req.body,
        individaul_img: individualImg,
      },
      password: req.body.password,
    });

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: client,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginClient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 🔍 find client by company OR individual email
    const client = await Client.findOne({
      $or: [
        { "companyInfo.companyEmail": email },
        { "individualInfo.email": email },
      ],
    });
    console.log(client);

    if (!client) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 🔐 password match
    const isMatch = await client.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // 🎟 JWT token
    const token = jwt.sign(
      { id: client._id, role: client.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: client._id,
        status: client.status,
        companyInfo: client.companyInfo,
        individualInfo: client.individualInfo,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//create member by super_admin or user
export const createMember = async (req, res) => {
  const creator = req.user;

  if (!["user", "super_admin"].includes(creator.role)) {
    return res.status(403).json({ message: "Not allowed" });
  }

  // userId must be passed if super_admin is creating
  const assignedUserId =
    creator.role === "user" ? creator.id : req.body.createdByUser;

  if (!assignedUserId) {
    return res.status(400).json({ message: "User ID required" });
  }

  const member = await User.create({
    ...req.body,
    role: "member",
    createdByUser: assignedUserId,
  });

  // push member into user's members array
  await User.findByIdAndUpdate(assignedUserId, {
    $push: { members: member._id },
  });

  res.status(201).json(member);
};

export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate(
        "companyInfo.country companyInfo.state companyInfo.city companyInfo.pincode",
      )
      .populate(
        "individualInfo.individual_country individualInfo.individual_state individualInfo.individual_city individualInfo.individual_pincode",
      )

      .populate("team");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const changeClientStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: client.status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateClient = async (req, res) => {
  console.log(req.body, "bkbkkbkbkb", req.file);
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // 🔥 Update Company Image
    if (req.files?.companyImg?.[0]) {
      const uploadCompany = await imagekit.upload({
        file: req.files.companyImg[0].buffer,
        fileName: Date.now() + "-" + req.files.companyImg[0].originalname,
        folder: "/clients",
      });

      client.companyInfo.img = uploadCompany.url;
    }

    // 🔥 Update Individual Image
    if (req.files?.individualImg?.[0]) {
      const uploadIndividual = await imagekit.upload({
        file: req.files.individualImg[0].buffer,
        fileName: Date.now() + "-" + req.files.individualImg[0].originalname,
        folder: "/clients",
      });

      client.individualInfo.individaul_img = uploadIndividual.url;
    }

    // Update other fields
    Object.assign(client.companyInfo, req.body.companyInfo || {});
    Object.assign(client.individualInfo, req.body.individualInfo || {});

    if (req.body.password) {
      client.password = req.body.password;
    }

    await client.save();

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createInvite = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      note,
      address,
      streetAddress,
      country,
      state,
      city,
      pincode,
      assignTo: assignToFromBody,
    } = req.body;

    let assignTo;

    if (req.user.role === "client") {
      assignTo = req.user._id;
    } else if (req.user.role === "super_admin") {
      if (!assignToFromBody) {
        return res
          .status(400)
          .json({ message: "Client ID is required for assignment" });
      }
      assignTo = assignToFromBody;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const inviteId = new mongoose.Types.ObjectId();

    const invite = await Invite.create({
      _id: inviteId,
      firstName,
      lastName,
      email,
      phone,
      role,
      note,
      address,
      streetAddress,
      country,
      state,
      city,
      pincode,
      assignTo,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    await Client.findByIdAndUpdate(assignTo, {
      $push: { invites: invite._id },
    });

    const link = `https://api.greyninja.in/inviteMember/${token}`;
    console.log(token, link);
    // ✅ SEND EMAIL HERE
    // await sendEmail(
    //   email,
    //   "You're Invited to Join 🎉",
    //   `
    //   <div style="font-family: Arial, sans-serif;">
    //     <h2>Hello ${firstName},</h2>
    //     <p>You have been invited to join our platform.</p>
    //     <p><strong>Role:</strong> ${role}</p>
    //     <p>Click below to accept your invite:</p>
    //     <a href="${link}"
    //        style="display:inline-block;padding:10px 20px;background:#e11d48;color:white;text-decoration:none;border-radius:6px;">
    //        Accept Invite
    //     </a>
    //     <p>This link will expire in 24 hours.</p>
    //   </div>
    //   `
    // );

    res.status(201).json({
      message: "Member invite sent successfully",
      inviteId: invite._id,
      link,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// GET /invite/:token
export const getInviteByToken = async (req, res) => {
  const invite = await Invite.findOne({
    token: req.params.token,
    expiresAt: { $gt: Date.now() },
  }).populate("country state city pincode");

  if (!invite) {
    return res.status(400).json({ message: "Invalid or expired invite" });
  }

  res.json(invite); // prefill frontend form
};

export const acceptInvite = async (req, res) => {
  console.log(req.body);
  try {
    const { token, password } = req.body;
    // console.log(req.body)
    console.log(token);

    if (!token || !password) {
      return res.status(400).json({ message: "Token & password required" });
    }

    const invite = await Invite.findOne({ token });

    if (!invite) {
      return res.status(400).json({ message: "Invite not found or expired" });
    }

    // 🔐 only allow specific fields to be updated
    const allowedUpdates = {
      firstName: req.body.firstName ?? invite.firstName,
      lastName: req.body.lastName ?? invite.lastName,
      phone: req.body.phone ?? invite.phone,
      note: req.body.note ?? invite.note,
      address: req.body.address ?? invite.address,
      streetAddress: req.body.streetAddress ?? invite.streetAddress,
      country: req.body.country ?? invite.country,
      state: req.body.state ?? invite.state,
      city: req.body.city ?? invite.city,
      pincode: req.body.pincode ?? invite.pincode,
    };

    const member = new Member({
      _id: invite._id, // SAME ID
      email: invite.email, // LOCKED
      role: invite.role, // LOCKED
      assignTo: invite.assignTo, // LOCKED
      password,

      ...allowedUpdates,

      profileImg: req.file ? `/uploads/members/${req.file.filename}` : null,
    });

    await member.save();

    // 🧹 cleanup
    await Invite.deleteOne({ _id: invite._id });

    // await Client.findByIdAndUpdate(invite.assignTo, {
    //   $pull: { invites: invite._id },
    // });

    res.status(201).json({
      message: "Member account created successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const signinMember = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const member = await Member.findOne({ email });

    if (!member) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch =
      (await member.comparePassword?.(password)) ||
      (await (
        await import("bcryptjs")
      ).default.compare(password, member.password));

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(member._id, member.role);

    res.json({
      message: "Login successful",
      token,
      member: {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role,
        assignTo: member.assignTo,
        profileImg: member.profileImg,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * GET ALL MEMBERS
 */

export const getAllMembers = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      sort = "", // default empty (newest first)
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const trimmedSearch = search.trim();
    const regex = trimmedSearch ? new RegExp(trimmedSearch, "i") : null;

    // Base status filter
    const baseMatch = {};
    if (status && status !== "all") {
      baseMatch.status = status;
    }

    // ───────────────── Lookup Stages ─────────────────
    const lookupStages = [
      {
        $lookup: {
          from: "countries",
          localField: "country",
          foreignField: "_id",
          as: "countryData",
        },
      },
      { $unwind: { path: "$countryData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "_id",
          as: "stateData",
        },
      },
      { $unwind: { path: "$stateData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "cities",
          localField: "city",
          foreignField: "_id",
          as: "cityData",
        },
      },
      { $unwind: { path: "$cityData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "pincodes",
          localField: "pincode",
          foreignField: "_id",
          as: "pincodeData",
        },
      },
      { $unwind: { path: "$pincodeData", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "clients",
          let: { clientId: "$assignTo" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$clientId"] },
              },
            },
            {
              $project: {
                _id: 1,
                companyInfo: {
                  companyName: "$companyInfo.companyName",
                  email: "$companyInfo.companyEmail",
                  phone: "$companyInfo.companyPhone",
                },
              },
            },
          ],
          as: "clientData",
        },
      },
      { $unwind: { path: "$clientData", preserveNullAndEmptyArrays: true } },
    ];

    // ───────────────── Search Stage ─────────────────
    const searchStage = regex
      ? [
          {
            $match: {
              $or: [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phone: regex },
                { "cityData.city_name": regex },
                { "stateData.state_name": regex },
                { "countryData.country_name": regex },
                { "pincodeData.code": regex },
              ],
            },
          },
        ]
      : [];

    // ───────────────── Sort Stage ─────────────────
    let sortStages = [];

    if (sort==="") {
      // Default: newest first
      sortStages = [{ $sort: { createdAt: 1 } }];
    } else {
      // Case-insensitive sorting by firstName
      sortStages = [
        {
          $addFields: {
            firstNameLower: { $toLower: "$firstName" },
          },
        },
        {
          $sort: {
            firstNameLower: sort.toLowerCase() === "az" ? 1 : -1,
          },
        },
      ];
    }

    // ───────────────── Data Pipeline ─────────────────
    const dataPipeline = [
      { $match: baseMatch },
      ...lookupStages,
      ...searchStage,
      ...sortStages,
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          role: 1,
          note: 1,
          address: 1,
          streetAddress: 1,
          status: 1,
          country: "$countryData",
          state: "$stateData",
          city: "$cityData",
          pincode: "$pincodeData",
          assignTo: "$clientData",
          createdAt: 1,
        },
      },
    ];

    const members = await Member.aggregate(dataPipeline);

    // ───────────────── Count Pipeline ─────────────────
    const countPipeline = [
      { $match: baseMatch },
      ...lookupStages,
      ...searchStage,
      { $count: "total" },
    ];

    const totalResult = await Member.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: members,
    });
  } catch (error) {
    console.error("Get Members Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch members",
      error: error.message,
    });
  }
};

/**
 * GET MEMBER BY ID
 */
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate("country state city pincode")
      .populate("assignTo", "companyInfo.companyName");

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // 🔐 ownership check
    if (
      req.user.role === "client" &&
      member.assignTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * UPDATE MEMBER
 */
export const updateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // 🔐 ownership check
    if (
      req.user.role === "client" &&
      member.assignTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ❌ fields that cannot be changed
    const blockedFields = ["email", "assignTo", "role", "password"];
    blockedFields.forEach((field) => delete req.body[field]);

    // ✅ allowed updates
    Object.assign(member, req.body);

    if (req.file) {
      member.profileImg = `/uploads/members/${req.file.filename}`;
    }

    await member.save();

    res.json({ message: "Member updated successfully", member });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE MEMBER
 */
export const deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // 🔐 ownership check
    if (
      req.user.role === "client" &&
      member.assignTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await member.deleteOne();

    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 1️⃣ Get All Client List (Minimal)
 */
export const getAllClientList = async (req, res) => {
  try {
    const clients = await Client.find({}).select(
      "_id companyInfo.companyName companyInfo.companyEmail",
    );

    const formatted = clients.map((c) => ({
      _id: c._id,
      name: c.companyInfo.companyName,
      email: c.companyInfo.companyEmail,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 2️⃣ Get All Clients (Full)
 */
export const getAllClients = async (req, res) => {
  try {
    const {
      status, // "active" | "inactive" | "all"
      search = "",
      sort = "recent", // "recent" | "az" | "za"
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    // -------------------------
    // 1️⃣ Build Filter Object
    // -------------------------
    const filter = {};

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Search filter
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      filter.$or = [
        { "companyInfo.companyName": searchRegex },
        { "companyInfo.primeryContactFirstName": searchRegex },
        { "companyInfo.primeryContactEmail": searchRegex },
        { "companyInfo.companyPhone": searchRegex },
        { "companyInfo.address": searchRegex },

        { "individualInfo.firstName": searchRegex },
        { "individualInfo.email": searchRegex },
        { "individualInfo.phone": searchRegex },
        { "individualInfo.individaul_address": searchRegex },
      ];
    }

    // Date filter
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

    // -------------------------
    // 2️⃣ Sorting Logic
    // -------------------------
    let sortObj = { createdAt: -1 }; // default → newest first

    if (sort === "az") {
      sortObj = { "companyInfo.companyName": 1 };
    } else if (sort === "za") {
      sortObj = { "companyInfo.companyName": -1 };
    }

    // -------------------------
    // 3️⃣ Pagination
    // -------------------------
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // -------------------------
    // 4️⃣ Execute Query
    // -------------------------
    const clientsQuery = Client.find(filter)
      .collation({ locale: "en", strength: 2 }) // ✅ Proper dictionary sorting
      .populate(
        "companyInfo.country companyInfo.state companyInfo.city companyInfo.pincode",
      )
      .populate(
        "individualInfo.individual_country individualInfo.individual_state individualInfo.individual_city individualInfo.individual_pincode",
      )
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const [clients, total] = await Promise.all([
      clientsQuery.exec(),
      Client.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    // -------------------------
    // 5️⃣ Response
    // -------------------------
    res.json({
      success: true,
      data: clients,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      currentSort:
        sort === "az"
          ? "A to Z (by company)"
          : sort === "za"
            ? "Z to A (by company)"
            : "Newest first",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Server error",
      message: err.message,
    });
  }
};

/**
 * 3️⃣ Get All Members By Client ID (Full)
 */
export const getAllMemberByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;

    // 🔐 client can only access their own members
    if (req.user.role === "client" && req.user._id.toString() !== clientId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = await Member.find({ assignTo: clientId }).populate(
      "country state city pincode",
    );

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 4️⃣ Get All Member List By Client ID (Minimal)
 */
export const getAllMemberListByClientId = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (req.user.role === "client" && req.user._id.toString() !== clientId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = await Member.find({ assignTo: clientId }).select(
      "_id firstName lastName email",
    );

    const formatted = members.map((m) => ({
      _id: m._id,
      name: `${m.firstName} ${m.lastName}`,
      email: m.email,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SIGNUP (User / Admin)
export const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      position,

      notes,
      enforcedScheduledJobs,
      address,
      streetAddress,
      country,
      state,
      city,
      pincode,
      password,
    } = req.body;

    if (!firstName || !lastName || !password || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, password and email or phone required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,

      position,
      notes,
      enforcedScheduledJobs,
      address,
      streetAddress,
      country,

      state,
      city,
      pincode,
      password,
      role: role || "member",
    });

    res.status(201).json({
      success: true,
      message: "Signup successful",
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SIGNIN (email OR phone + password)
export const signin = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Phone and password required",
      });
    }

let user =
  await User.findOne({ $or: [{ email }, { phone }] }).select("+password") ||
  await Member.findOne({ $or: [{ email }, { phone }] }).select("+password") ||
  await Client.findOne({ $or: [{ email }, { phone }] }).select("+password");


    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully (client should delete token)",
  });
};

// GET CURRENT USER PROFILE
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//GET ALL USERS (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      status,
      position,
      enforcedScheduledJobs,
      country,
      state,
      city,
      page = 1,
      limit = 10,
    } = req.query;

    // ✅ Base filter: ONLY members
    const filter = {
      role: "member",
    };

    // 🔍 Search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // 🎯 Exact match filters
    if (status) filter.status = status;
    if (position) filter.position = position;
    if (country) filter.country = country;
    if (state) filter.state = state;
    if (city) filter.city = city;

    // 🔘 Boolean filter (string → boolean)
    if (enforcedScheduledJobs !== undefined) {
      filter.enforcedScheduledJobs = enforcedScheduledJobs === "true";
    }

    const users = await User.find(filter)
      .select("-password") // 🔐 hide password
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//GET USER BY ID (Admin)
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//UPDATE USER (Admin)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    Object.keys(updates).forEach((key) => {
      user[key] = updates[key];
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE USER (Admin)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//CHANGE STATUS (Admin)
export const changeUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// controllers/inviteController.js

export const getAllInvites = async (req, res) => {
  try {
    const {
      search = "",
      status = "all", // "pending" | "accepted" | "all"
      sort = "newest", // "newest" | "oldest" | "az" | "za"
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // 1. Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // 2. Search (name, email, phone, note, address, city name via populate)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { note: searchRegex },
        { address: searchRegex },
        { streetAddress: searchRegex },
      ];
    }

    // 3. Sorting
    let sortOption = { createdAt: -1 }; // newest first

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    } else if (sort === "az") {
      sortOption = { firstName: 1, lastName: 1 };
    } else if (sort === "za") {
      sortOption = { firstName: -1, lastName: -1 };
    }

    // 4. Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const invitesQuery = Invite.find(filter)
      .populate("country", "name code")
      .populate("state", "state_name")
      .populate("city", "city_name")
      .populate("pincode", "pincode_name")
      .populate("assignTo", "companyInfo.companyName companyInfo.companyEmail")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const [invites, total] = await Promise.all([
      invitesQuery.exec(),
      Invite.countDocuments(filter),
    ]);

    // Optional: post-filter search on populated city name
    let finalInvites = invites;
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      finalInvites = invites.filter((invite) => {
        const cityName = invite.city?.city_name || "";
        return searchRegex.test(cityName);
      });
    }

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: finalInvites,
    });
  } catch (err) {
    console.error("Error fetching invites:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invites",
      error: err.message,
    });
  }
};

export const getInviteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid invite ID" });
    }

    const invite = await Invite.findById(id)
      .populate("country", "name code")
      .populate("state", "state_name")
      .populate("city", "city_name")
      .populate("pincode", "pincode_name")
      .populate("assignTo", "companyInfo.companyName companyInfo.companyEmail");

    if (!invite) {
      return res
        .status(404)
        .json({ success: false, message: "Invite not found" });
    }

    res.json({
      success: true,
      data: invite,
    });
  } catch (err) {
    console.error("Error fetching invite:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invite",
      error: err.message,
    });
  }
};

export const deleteInvite = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid invite ID" });
    }

    const invite = await Invite.findByIdAndDelete(id);

    if (!invite) {
      return res
        .status(404)
        .json({ success: false, message: "Invite not found" });
    }

    res.json({
      success: true,
      message: "Invite deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting invite:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete invite",
      error: err.message,
    });
  }
};

import {
  signup,
  signin,
  logout,
  getProfilebyId,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserStatus,
  createClient,
  createMember,
  loginClient,
  getClientById,
  deleteClient,
  changeClientStatus,
  updateClient,
  createInvite,
  getInviteByToken,
  acceptInvite,
  getMemberById,
  getAllMembers,
  updateMember,
  deleteMember,
  signinMember,
  getAllClientList,
  getAllClients,
  getAllMemberByClientId,
  getAllMemberListByClientId,
  getAllInvites,
  getInviteById,
  deleteInvite,
} from "../controller/auth.controller.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { Router } from "express";
import { upload } from "../middleware/upload.js";

const router = Router();
//

// Public
router.post("/signup",  signup);
router.post("/signin",  signin);
router.post("/logout",  logout);
router.post(
  "/client",
  protect,

  upload.fields([
    { name: "companyImg", maxCount: 1 },
    { name: "individualImg", maxCount: 1 },
  ]),
  createClient,
);
router.post("/login-client", protect, loginClient);
router.get("/client/:id", protect, getClientById);
router.delete("/client/:id", protect, deleteClient);
router.patch("/client-status/:id", protect, changeClientStatus);
router.put(
  "/update-client/:id",
  protect,
  upload.fields([
    { name: "companyImg", maxCount: 1 },
    { name: "individualImg", maxCount: 1 },
  ]),
  updateClient,
);

router.post(
  "/member",

  createInvite,
);
router.get("/member/:token", getInviteByToken);
router.post(
  "/member/accept",

  upload.single("profileImg"),
  acceptInvite,
);
router.post("/signin/member", protect, signinMember);

/**
 * GET all members
 */
router.get("/member", protect, getAllMembers);

/**
 * GET member by ID
 */
router.get("/member/profile/:id", protect, getMemberById);

/**
 * UPDATE member
 */
router.put(
  "/member/:id",
  protect,

  // authorize("client", "super_admin"),
  upload.single("profileImg"),
  updateMember,
);

/**
 * DELETE member
 */
router.delete(
  "/member/:id",

  protect,
  deleteMember,
);

/**
 * CLIENT APIs
 */
router.get(
  "/clients/list",

  protect,
  getAllClientList,
);

router.get(
  "/clients",

  protect,
  getAllClients,
);

/**
 * MEMBER BY CLIENT APIs
 */
router.get(
  "/clients/:clientId/members",

  protect,
  getAllMemberByClientId,
);

router.get(
  "/clients/:clientId/members/list",

  protect,
  getAllMemberListByClientId,
);

// router.post("/member",   authorize("super_admin","user"), createMember);

// Role based APIs
router.get("/super_admin", protect, (req, res) => {
  res.json({
    success: true,
    message: "Welcome Admin",
    user: req.user,
  });
});

// router.get("/member",   authorize("member", "super_admin"), (req, res) => {
//   res.json({
//     success: true,
//     message: "Welcome User",
//     user: req.user,
//   });
// });
// Protected Routes
router.get("/profile/:id", protect, getProfilebyId);

// Admin Routes
router.get("/users", protect, getAllUsers);
router.get("/user/:userId", protect, getUserById);
// Additional admin routes for updating and deleting users
router.put("/user/:userId", protect, updateUser);
router.delete("/user/:userId", protect, deleteUser);
router.patch(
  "/user/:userId/status",

  protect,
  changeUserStatus,
);

// GET all invites with filters & pagination
router.get("/invite", protect, getAllInvites);

// GET single invite by ID
router.get("/invite/:id", protect, getInviteById);

// DELETE invite by ID
router.delete("/invite/:id", protect, deleteInvite);

export default router;

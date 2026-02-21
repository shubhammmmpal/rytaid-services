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

  getAllInvites, getInviteById, deleteInvite
} from "../controller/auth.controller.js";
import {   authorize } from "../middleware/authMiddleware.js";
import { Router } from "express";
import { upload } from "../middleware/upload.js";

const router = Router();
//

// Public
router.post("/signup", signup);
router.post("/signin", signin);
router.post("/logout",   logout);
router.post(
  "/client",
   
  authorize("super_admin"),
  upload.fields([
    { name: "companyImg", maxCount: 1 },
    { name: "individualImg", maxCount: 1 },
  ]),
  createClient,
);
router.post("/login-client", loginClient);
router.get("/client/:id",   getClientById);
router.delete("/client/:id",   deleteClient);
router.patch("/client-status/:id",   changeClientStatus);
router.put(
  "/update-client/:id",
  upload.fields([
    { name: "companyImg", maxCount: 1 },
    { name: "individualImg", maxCount: 1 },
  ]),
  updateClient,
);

router.post(
  "/member",
   
  authorize("client", "super_admin"),
  createInvite,
);
router.get("/member/:token",  getInviteByToken);
router.post(
  "/member/accept",
  
  upload.single("profileImg"),
  acceptInvite,
);
router.post("/signin/member", signinMember);

/**
 * GET all members
 */
router.get("/member", getAllMembers);

/**
 * GET member by ID
 */
router.get("/member/profile/:id",getMemberById);

/**
 * UPDATE member
 */
router.put(
  "/member/:id",
   
  // authorize("client", "super_admin"),
  upload.single("profileImg"),
  updateMember,
);

/**
 * DELETE member
 */
router.delete(
  "/member/:id",
   
  authorize("client", "super_admin"),
  deleteMember,
);

/**
 * CLIENT APIs
 */
router.get(
  "/clients/list",
   
  // authorize("super_admin"),
  getAllClientList
);

router.get(
  "/clients",
   
  // authorize("super_admin"),
  getAllClients
);

/**
 * MEMBER BY CLIENT APIs
 */
router.get(
  "/clients/:clientId/members",
   
  // authorize("super_admin", "client"),
  getAllMemberByClientId
);

router.get(
  "/clients/:clientId/members/list",
   
  // authorize("super_admin", "client"),
  getAllMemberListByClientId
);

// router.post("/member",   authorize("super_admin","user"), createMember);

// Role based APIs
router.get("/super_admin",   authorize("super_admin"), (req, res) => {
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
router.get("/profile/:id",   getProfilebyId);

// Admin Routes
router.get("/users",  authorize("super_admin"), getAllUsers);
router.get("/user/:userId",   authorize("super_admin"), getUserById);
// Additional admin routes for updating and deleting users
router.put("/user/:userId",   authorize("super_admin"), updateUser);
router.delete("/user/:userId",   authorize("super_admin"), deleteUser);
router.patch(
  "/user/:userId/status",
   
  authorize("super_admin"),
  changeUserStatus,
);

// GET all invites with filters & pagination
router.get("/invite", getAllInvites);

// GET single invite by ID
router.get("/invite/:id", getInviteById);

// DELETE invite by ID
router.delete("/invite/:id", deleteInvite);

export default router;

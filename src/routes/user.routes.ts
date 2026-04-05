import express from "express";
import { getMe, getAllUsers, getUserById, updateUser, updateUserRole, changePassword, reactivateUser, deleteUser } from "../controllers/user.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

router.get("/me", authenticate, getMe);
router.get("/", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), getAllUsers);
router.get("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), getUserById);
router.patch("/", authenticate, updateUser);
router.patch("/password", authenticate, changePassword);
router.patch("/:id/role", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), updateUserRole);
router.patch("/:id/reactivate", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), reactivateUser);
router.delete("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), deleteUser);

export default router;

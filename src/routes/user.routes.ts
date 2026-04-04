import express from "express";
import { getAllUsers, getUserById, updateUser, updateUserRole, changePassword, deleteUser } from "../controllers/user.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

router.get("/", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), getAllUsers);
router.get("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), getUserById);
router.patch("/:id", authenticate, updateUser);
router.patch("/:id/role", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), updateUserRole);
router.patch("/:id/password", authenticate, changePassword);
router.delete("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), deleteUser);

export default router;

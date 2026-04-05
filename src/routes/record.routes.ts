import express from "express";
import { createRecord, getAllRecords, getRecordById, updateRecord, deleteRecord } from "../controllers/record.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

// ADMIN/SUPERADMIN: full CRUD on all records
// ANALYST: read all records
// VIEWER: read only their own records

router.post("/", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), createRecord);
router.get("/", authenticate, getAllRecords); // with filters
router.get("/:id", authenticate,  getRecordById);
router.patch("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), updateRecord);
router.delete("/:id", authenticate, authorize([ROLES.ADMIN, ROLES.SUPERADMIN]), deleteRecord);

export default router;

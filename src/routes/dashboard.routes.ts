import express from "express";
import {
	getDashboardSummary,
	getCategoryTotals,
	getMonthlyTrends,
	getWeeklyTrends,
	getRecentActivity,
} from "../controllers/dashboard.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

const dashboardRoles = [ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPERADMIN];

router.get("/summary", authenticate, authorize(dashboardRoles), getDashboardSummary);
router.get("/category-breakdown", authenticate, authorize(dashboardRoles), getCategoryTotals);
router.get("/trends/monthly", authenticate, authorize(dashboardRoles), getMonthlyTrends);
router.get("/trends/weekly", authenticate, authorize(dashboardRoles), getWeeklyTrends);
router.get("/recent", authenticate, authorize(dashboardRoles), getRecentActivity);

export default router;

import { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.services";
import { ApiError } from "../utils/api_error";
import { ApiResponse } from "../utils/api_response";
import { GLOBAL_ERROR_MESSAGES } from "../constants/app.messages";
import { getLogger } from "../lib/logger";

const logger = getLogger("dashboard.controller");

const getDashboardSummary = async (req: Request, res: Response) => {
	try {
		const summary = await dashboardService.getDashboardSummary();
		res.status(200).json(new ApiResponse(200, "Dashboard summary fetched successfully", summary));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
		logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const getCategoryTotals = async (req: Request, res: Response) => {
	try {
		const categories = await dashboardService.getCategoryTotals();
		res.status(200).json(new ApiResponse(200, "Category totals fetched successfully", categories));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
		logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const getMonthlyTrends = async (req: Request, res: Response) => {
	try {
		const trends = await dashboardService.getMonthlyTrends();
		res.status(200).json(new ApiResponse(200, "Monthly trends fetched successfully", trends));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
		logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const getWeeklyTrends = async (req: Request, res: Response) => {
	try {
		const trends = await dashboardService.getWeeklyTrends();
		res.status(200).json(new ApiResponse(200, "Weekly trends fetched successfully", trends));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
		logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const getRecentActivity = async (req: Request, res: Response) => {
	try {
		const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 10, 50));
		const activity = await dashboardService.getRecentActivity(limit);
		res.status(200).json(new ApiResponse(200, "Recent activity fetched successfully", activity));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
		logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

export { getDashboardSummary, getCategoryTotals, getMonthlyTrends, getWeeklyTrends, getRecentActivity };

import { Request, Response } from "express";
import { recordService } from "../services/record.services";
import { ApiError } from "../utils/api_error";
import { ApiResponse } from "../utils/api_response";
import { GLOBAL_ERROR_MESSAGES } from "../constants/app.messages";
import { getLogger } from "../lib/logger";

const logger = getLogger("record.controller");

const getAllRecords = async (req: Request, res: Response) => {
	try {
		const records = await recordService.getRecords(req.query);
		res.status(200).json(new ApiResponse(200, "Records fetched successfully", records));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
				logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const getRecordById = async (req: Request, res: Response) => {
	try {
		const record = await recordService.getRecordById(req.params.id as string);
		res.status(200).json(new ApiResponse(200, "Record fetched successfully", record));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
				logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const createRecord = async (req: Request, res: Response) => {
	try {
		const record = await recordService.createRecord(req.body, req.user.id);
		res.status(201).json(new ApiResponse(201, "Record created successfully", record));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
				logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const updateRecord = async (req: Request, res: Response) => {
	try {
		const record = await recordService.updateRecord(req.params.id as string, req.body);
		res.status(200).json(new ApiResponse(200, "Record updated successfully", record));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
				logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const deleteRecord = async (req: Request, res: Response) => {
	try {
		await recordService.deleteRecord(req.params.id as string);
		res.status(200).json(new ApiResponse(200, "Record deleted successfully", null));
	} catch (error) {
		if (error instanceof ApiError) return res.status(error.code).json(error);
				logger.error("Unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

export { getAllRecords , getRecordById, createRecord, updateRecord, deleteRecord };

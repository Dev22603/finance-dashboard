import { Request, Response } from "express";
import { userService } from "../services/user.services";
import { ApiError } from "../utils/api_error";
import { ApiResponse } from "../utils/api_response";
import { trimStrings } from "../utils/common_functions";
import { USER_FEEDBACK_MESSAGES, GLOBAL_ERROR_MESSAGES } from "../constants/app.messages";

const getAllUsers = async (req: Request, res: Response) => {
	try {
		const users = await userService.getAllUsers();
		const response = new ApiResponse(200, "Users fetched successfully", users);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const getUserById = async (req: Request, res: Response) => {
	try {
		const id = req.params.id as string;
		const user = await userService.getUserById(id);
		const response = new ApiResponse(200, "User fetched successfully", user);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const updateUser = async (req: Request, res: Response) => {
	try {
		const updated = await userService.updateUser(req.user.id, trimStrings(req.body));
		const response = new ApiResponse(200, USER_FEEDBACK_MESSAGES.USER_UPDATED_SUCCESS, updated);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const updateUserRole = async (req: Request, res: Response) => {
	try {
		const id = req.params.id as string;
		const updated = await userService.updateUserRole(req.user, id, req.body.role);
		const response = new ApiResponse(200, USER_FEEDBACK_MESSAGES.USER_UPDATED_SUCCESS, updated);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const changePassword = async (req: Request, res: Response) => {
	try {
		await userService.changePassword(req.user.id, trimStrings(req.body));
		const response = new ApiResponse(200, "Password changed successfully", null);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const reactivateUser = async (req: Request, res: Response) => {
	try {
		const id = req.params.id as string;
		const reactivated = await userService.reactivateUser(id);
		const response = new ApiResponse(200, USER_FEEDBACK_MESSAGES.USER_REACTIVATED_SUCCESS, reactivated);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

const deleteUser = async (req: Request, res: Response) => {
	try {
		const id = req.params.id as string;
		const soft = req.query.soft === "true";
		const deleted = await userService.deleteUser(req.user, id, soft);
		const message = soft ? USER_FEEDBACK_MESSAGES.USER_SOFT_DELETED_SUCCESS : USER_FEEDBACK_MESSAGES.USER_DELETED_SUCCESS;
		const response = new ApiResponse(200, message, deleted);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, GLOBAL_ERROR_MESSAGES.SERVER_ERROR));
	}
};

export { getAllUsers, getUserById, updateUser, updateUserRole, changePassword, reactivateUser, deleteUser };

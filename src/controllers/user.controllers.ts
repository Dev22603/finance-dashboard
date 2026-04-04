import { Request, Response } from "express";
import { userService } from "../services/user.services";
import { ApiError } from "../utils/api_error";
import { ApiResponse } from "../utils/api_response";

const getAllUsers = async (req: Request, res: Response) => {
	try {
		const users = await userService.getAllUsers();
		const response = new ApiResponse(200, "Users fetched successfully", users);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			return res.status(error.code).json(error);
		}
		res.status(500).json(new ApiError(500, "Internal server error"));
	}
};

const getUserById = async (req: Request, res: Response) => {};

const updateUser = async (req: Request, res: Response) => {};

const updateUserRole = async (req: Request, res: Response) => {};

const changePassword = async (req: Request, res: Response) => {};

const deleteUser = async (req: Request, res: Response) => {};

export { getAllUsers, getUserById, updateUser, updateUserRole, changePassword, deleteUser };

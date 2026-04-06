import { Request, Response } from "express";
import { authService } from "../services/auth.services";
import { ApiError } from "../utils/api_error";
import { ApiResponse } from "../utils/api_response";
import { getLogger } from "../lib/logger";

const logger = getLogger("auth.controller");

const signup = async (req: Request, res: Response) => {
	try {
		const userData = {
			first_name: req.body.first_name?.trim(),
			last_name: req.body.last_name?.trim(),
			email: req.body.email?.trim(),
			phone_number: req.body.phone_number?.trim(),
			password: req.body.password?.trim(),
		};

		const user = await authService.signup(userData);
		const response = new ApiResponse(201, "User registered successfully", user);
		res.status(201).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			logger.warn("Signup failed", { code: error.code, message: error.message });
			return res.status(error.code).json(error);
		}
		logger.error("Signup — unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, "Internal server error"));
	}
};

const login = async (req: Request, res: Response) => {
	try {
		const credentials = {
			email: req.body.email?.trim(),
			password: req.body.password?.trim(),
		};

		const result = await authService.login(credentials);
		const response = new ApiResponse(200, "Logged in successfully", result);
		res.status(200).json(response);
	} catch (error) {
		if (error instanceof ApiError) {
			logger.warn("Login failed", { code: error.code, message: error.message });
			return res.status(error.code).json(error);
		}
		logger.error("Login — unexpected error", { error: (error as Error).message });
		res.status(500).json(new ApiError(500, "Internal server error"));
	}
};

export { signup, login };

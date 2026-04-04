import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authRepository } from "../repositories/auth.repositories";
import { validateUserSignup, validateUserLogin } from "../schemas/user.schemas";
import { ApiError } from "../utils/api_error";
import { USER_FEEDBACK_MESSAGES } from "../constants/app.messages";

export const authService = {
	async signup(userData: any) {
		// Validation throws ApiError if invalid
		validateUserSignup(userData);

		const email = userData.email.toLowerCase();
		const name = userData.first_name + " " + userData.last_name;

		// Check if user already exists
		const userExists = await authRepository.userExists(email);
		if (userExists) {
			throw new ApiError(409, USER_FEEDBACK_MESSAGES.USER_ALREADY_EXISTS);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(userData.password, 10);

		// Create user
		const user = await authRepository.createUser(name, email, hashedPassword, userData.role);

		// Generate JWT token
		const token = jwt.sign(
			{
				id: user.id,
				role: user.role,
				name: user.name,
			},
			process.env.JWT_SECRET!,
			{ expiresIn: "10h" },
		);

		return {
			token,
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		};
	},

	async login(credentials: any) {
		// Validation throws ApiError if invalid
		validateUserLogin(credentials);

		const email = credentials.email.toLowerCase();
		const password = credentials.password;

		// Get user from database
		const user = await authRepository.getUserByEmail(email);
		if (!user) {
			throw new ApiError(401, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);
		}

		// Compare password
		const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
		if (!isPasswordMatch) {
			throw new ApiError(401, USER_FEEDBACK_MESSAGES.INVALID_CREDENTIALS);
		}

		// Generate JWT token
		const token = jwt.sign(
			{
				id: user.id,
				role: user.role,
				name: user.name,
			},
			process.env.JWT_SECRET!,
			{
				expiresIn: "10h",
			},
		);

		return {
			token,
			role: user.role,
			name: user.name,
		};
	},
};

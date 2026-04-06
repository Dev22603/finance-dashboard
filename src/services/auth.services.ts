import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userRepository as authRepository } from "../repositories/user.repositories";
import { validateUserSignup, validateUserLogin } from "../schemas/user.schemas";
import { ApiError } from "../utils/api_error";
import { USER_FEEDBACK_MESSAGES } from "../constants/app.messages";
import { getLogger } from "../lib/logger";

const logger = getLogger("auth.service");

export const authService = {
	async signup(userData: any) {
		validateUserSignup(userData);

		const email = userData.email.toLowerCase();
		const name = userData.first_name + " " + userData.last_name;

		const userExists = await authRepository.userExists(email);
		if (userExists) {
			throw new ApiError(409, USER_FEEDBACK_MESSAGES.USER_ALREADY_EXISTS);
		}

		const hashedPassword = await bcrypt.hash(userData.password, 10);
		const user = await authRepository.createUser(name, email, hashedPassword);

		const token = jwt.sign(
			{ id: user.id, role: user.role, name: user.name },
			process.env.JWT_SECRET!,
			{ expiresIn: "10h" },
		);

		logger.info("User signed up", { userId: user.id, email: user.email });

		return { token, id: user.id, name: user.name, email: user.email, role: user.role };
	},

	async login(credentials: any) {
		validateUserLogin(credentials);

		const email = credentials.email.toLowerCase();

		const user = await authRepository.getUserByEmail(email);
		if (!user) {
			throw new ApiError(401, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);
		}

		const isPasswordMatch = await bcrypt.compare(credentials.password, user.passwordHash);
		if (!isPasswordMatch) {
			logger.warn("Failed login attempt", { email });
			throw new ApiError(401, USER_FEEDBACK_MESSAGES.INVALID_CREDENTIALS);
		}

		const token = jwt.sign(
			{ id: user.id, role: user.role, name: user.name },
			process.env.JWT_SECRET!,
			{ expiresIn: "10h" },
		);

		logger.info("User logged in", { userId: user.id, email: user.email });

		return { token, role: user.role, name: user.name };
	},
};

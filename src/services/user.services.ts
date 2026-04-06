import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repositories";
import { validateUserUpdate, validateUserRole, validateUserPasswordUpdate } from "../schemas/user.schemas";
import { ApiError } from "../utils/api_error";
import { USER_FEEDBACK_MESSAGES } from "../constants/app.messages";
import { ROLES } from "../constants/app.constants";
import { getLogger } from "../lib/logger";

const logger = getLogger("user.service");

export const userService = {
	async getAllUsers() {
		return userRepository.getAllUsers();
	},

	async getUserById(id: string) {
		const user = await userRepository.getUserById(id);
		if (!user) throw new ApiError(404, "User not found");
		return user;
	},

	async updateUser(id: string, data: any) {
		const user = await userRepository.getUserById(id);
		if (!user) throw new ApiError(404, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);

		const validated = validateUserUpdate(data);

		if (validated.email && validated.email !== user.email) {
			const emailTaken = await userRepository.userExists(validated.email);
			if (emailTaken) throw new ApiError(409, USER_FEEDBACK_MESSAGES.USER_ALREADY_EXISTS);
		}

		const updated = await userRepository.updateUser(id, validated);
		logger.info("User updated", { userId: id });
		return updated;
	},

	async updateUserRole(requester: { id: string; role: ROLES }, targetId: string, data: any) {
		const targetUser = await userRepository.getUserById(targetId);
		if (!targetUser) throw new ApiError(404, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);

		const newRole = validateUserRole(data);

		if (newRole === ROLES.SUPERADMIN) {
			throw new ApiError(403, USER_FEEDBACK_MESSAGES.CANNOT_ASSIGN_SUPERADMIN);
		}

		if (requester.role === ROLES.SUPERADMIN && requester.id === targetId) {
			throw new ApiError(403, USER_FEEDBACK_MESSAGES.SUPERADMIN_CANNOT_CHANGE_OWN_ROLE);
		}

		if (requester.role === ROLES.ADMIN) {
			if (targetUser.role === ROLES.ADMIN || targetUser.role === ROLES.SUPERADMIN) {
				throw new ApiError(403, USER_FEEDBACK_MESSAGES.ADMIN_CANNOT_MODIFY_ADMIN_OR_SUPERADMIN);
			}
			if (newRole === ROLES.ADMIN) {
				throw new ApiError(403, USER_FEEDBACK_MESSAGES.ADMIN_CANNOT_ASSIGN_ADMIN_OR_ABOVE);
			}
		}

		const updated = await userRepository.updateUserRole(targetId, newRole);
		logger.info("User role updated", { targetId, newRole });
		return updated;
	},

	async changePassword(id: string, data: any) {
		const user = await userRepository.getUserByIdWithPassword(id);
		if (!user) throw new ApiError(404, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);

		const validated = validateUserPasswordUpdate(data);

		const isMatch = await bcrypt.compare(validated.current_password, user.passwordHash);
		const isPasswordSameAsPrevious = await bcrypt.compare(validated.new_password, user.passwordHash);
		if (!isMatch) throw new ApiError(401, USER_FEEDBACK_MESSAGES.INVALID_CREDENTIALS);

		const hashedPassword = await bcrypt.hash(validated.new_password, 10);

		if (isPasswordSameAsPrevious) throw new ApiError(401, USER_FEEDBACK_MESSAGES.SAME_PASSWORD_ERROR);
		await userRepository.changePassword(id, hashedPassword);
		logger.info("Password changed", { userId: id });
	},

	async reactivateUser(targetId: string) {
		const targetUser = await userRepository.getUserById(targetId);
		if (!targetUser) throw new ApiError(404, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);
		if (targetUser.isActive) throw new ApiError(409, USER_FEEDBACK_MESSAGES.USER_ALREADY_ACTIVE);

		return userRepository.reactivateUser(targetId);
	},

	async deleteUser(requester: { id: string; role: ROLES }, targetId: string, soft: boolean = false) {
		const targetUser = await userRepository.getUserById(targetId);
		if (!targetUser) throw new ApiError(404, USER_FEEDBACK_MESSAGES.USER_NOT_FOUND);

		if (requester.role === ROLES.SUPERADMIN && requester.id === targetId) {
			throw new ApiError(403, USER_FEEDBACK_MESSAGES.SUPERADMIN_CANNOT_DELETE_SELF);
		}

		if (requester.role === ROLES.ADMIN && (targetUser.role === ROLES.ADMIN || targetUser.role === ROLES.SUPERADMIN)) {
			throw new ApiError(403, USER_FEEDBACK_MESSAGES.USER_NOT_AUTHORIZED);
		}

		const result = soft ? await userRepository.softDeleteUser(targetId) : await userRepository.deleteUser(targetId);
		logger.info(soft ? "User soft deleted" : "User deleted", { targetId });
		return result;
	},
};

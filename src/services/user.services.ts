import { userRepository } from "../repositories/user.repositories";
import { ApiError } from "../utils/api_error";

export const userService = {
	async getAllUsers() {
		return userRepository.getAllUsers();
	},

	async getUserById(id: string) {
		const user = await userRepository.getUserById(id);
		if (!user) throw new ApiError(404, "User not found");
		return user;
	},

	async updateUser(id: string, data: any) {},

	async updateUserRole(id: string, role: string) {},

	async changePassword(id: string, currentPassword: string, newPassword: string) {},

	async deleteUser(id: string) {},
};

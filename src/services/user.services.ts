import { userRepository } from "../repositories/user.repositories";

export const userService = {
    async getAllUsers() {
        return userRepository.getAllUsers();
    },

    async getUserById(id: string) {},

    async updateUser(id: string, data: any) {},

    async updateUserRole(id: string, role: string) {},

    async changePassword(id: string, currentPassword: string, newPassword: string) {},

    async deleteUser(id: string) {},
};


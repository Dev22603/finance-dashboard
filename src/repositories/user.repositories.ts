import { ROLES } from "../constants/app.constants";
import { prisma } from "../lib/prisma";

export const userRepository = {
	async userExists(email: string) {
		const user = await prisma.user.findUnique({ where: { email } });
		return !!user;
	},

	async createUser(name: string, email: string, hashedPassword: string, role: ROLES) {
		return prisma.user.create({
			data: { name, email, passwordHash: hashedPassword, role },
		});
	},

	async getAllUsers() {
		return prisma.user.findMany({ omit: { passwordHash: true } });
	},

	async getUserById(id: string) {
		return prisma.user.findUnique({ where: { id } });
	},

	async getUserByEmail(email: string) {
		return prisma.user.findUnique({ where: { email } });
	},

	async updateUser(id: string, data: any) {},

	async updateUserRole(id: string, role: string) {},

	async changePassword(id: string, hashedPassword: string) {},

	async deleteUser(id: string) {},
};

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

	async updateUser(id: string, data: { name?: string; email?: string }) {
		return prisma.user.update({
			where: { id },
			data,
			omit: { passwordHash: true },
		});
	},

	async updateUserRole(id: string, role: ROLES) {
		return prisma.user.update({
			where: { id },
			data: { role },
			omit: { passwordHash: true },
		});
	},

	async changePassword(id: string, hashedPassword: string) {
		return prisma.user.update({
			where: { id },
			data: { passwordHash: hashedPassword },
			omit: { passwordHash: true },
		});
	},

	async softDeleteUser(id: string) {
		return prisma.user.update({ where: { id }, data: { isActive: false }, omit: { passwordHash: true } });
	},

	async reactivateUser(id: string) {
		return prisma.user.update({ where: { id }, data: { isActive: true }, omit: { passwordHash: true } });
	},

	async deleteUser(id: string) {
		return prisma.user.delete({ where: { id }, omit: { passwordHash: true } });
	},
};

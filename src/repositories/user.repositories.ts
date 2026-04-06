import { ROLES } from "../constants/app.constants";
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/logger";

const logger = getLogger("user.repository");

export const userRepository = {
	async userExists(email: string) {
		try {
			const user = await prisma.user.findUnique({ where: { email } });
			return !!user;
		} catch (error) {
			logger.error("DB error — userExists", { email, error: (error as Error).message });
			throw error;
		}
	},

	async createUser(name: string, email: string, hashedPassword: string) {
		try {
			return await prisma.user.create({ data: { name, email, passwordHash: hashedPassword } });
		} catch (error) {
			logger.error("DB error — createUser", { email, error: (error as Error).message });
			throw error;
		}
	},

	async getAllUsers() {
		try {
			return await prisma.user.findMany({ omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — getAllUsers", { error: (error as Error).message });
			throw error;
		}
	},

	async getUserById(id: string) {
		try {
			return await prisma.user.findUnique({ where: { id }, omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — getUserById", { id, error: (error as Error).message });
			throw error;
		}
	},

	async getUserByIdWithPassword(id: string) {
		try {
			return await prisma.user.findUnique({ where: { id } });
		} catch (error) {
			logger.error("DB error — getUserByIdWithPassword", { id, error: (error as Error).message });
			throw error;
		}
	},

	async getUserByEmail(email: string) {
		try {
			return await prisma.user.findUnique({ where: { email } });
		} catch (error) {
			logger.error("DB error — getUserByEmail", { email, error: (error as Error).message });
			throw error;
		}
	},

	async updateUser(id: string, data: { name?: string; email?: string }) {
		try {
			return await prisma.user.update({ where: { id }, data, omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — updateUser", { id, error: (error as Error).message });
			throw error;
		}
	},

	async updateUserRole(id: string, role: ROLES) {
		try {
			return await prisma.user.update({ where: { id }, data: { role }, omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — updateUserRole", { id, role, error: (error as Error).message });
			throw error;
		}
	},

	async changePassword(id: string, hashedPassword: string) {
		try {
			return await prisma.user.update({ where: { id }, data: { passwordHash: hashedPassword }, omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — changePassword", { id, error: (error as Error).message });
			throw error;
		}
	},

	async softDeleteUser(id: string) {
		try {
			return await prisma.user.update({ where: { id }, data: { isActive: false }, omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — softDeleteUser", { id, error: (error as Error).message });
			throw error;
		}
	},

	async reactivateUser(id: string) {
		try {
			return await prisma.user.update({ where: { id }, data: { isActive: true }, omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — reactivateUser", { id, error: (error as Error).message });
			throw error;
		}
	},

	async deleteUser(id: string) {
		try {
			return await prisma.user.delete({ where: { id }, omit: { passwordHash: true } });
		} catch (error) {
			logger.error("DB error — deleteUser", { id, error: (error as Error).message });
			throw error;
		}
	},
};

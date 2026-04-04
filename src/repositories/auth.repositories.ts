import { prisma } from "../lib/prisma";

export const authRepository = {
	async userExists(email: string) {
		const user = await prisma.user.findUnique({
			where: { email },
		});
		return !!user;
	},

	async createUser(name: string, email: string, hashedPassword: string, role: string) {
		return prisma.user.create({
			data: {
				name,
				email,
				passwordHash: hashedPassword,
				role,
			},
		});
	},

	async getUserByEmail(email: string) {
		return prisma.user.findUnique({
			where: { email },
		});
	},
};

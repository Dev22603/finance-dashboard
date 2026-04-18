import { userRepository } from "../src/repositories/user.repositories";

import { ROLES } from "../src/constants/app.constants";
import bcrypt from "bcrypt";
import { config } from "../src/constants/config";

async function createSuperAdmin() {
	const hashedPassword = await bcrypt.hash(config.SUPER_ADMIN_PASSWORD, 10);
	await userRepository.createUser(config.SUPER_ADMIN_NAME, config.SUPER_ADMIN_EMAIL, hashedPassword, ROLES.SUPERADMIN);
}

async function main() {
	console.log("🌱 Starting database seed...\n");

	try {
		const userExists = await userRepository.userExists(config.SUPER_ADMIN_EMAIL);
		if (!userExists) {
			await createSuperAdmin();
			console.log("\n✅ SUPER ADMIN ACCOUNT successfully created!");
		} else {
			console.log("\n✅ SUPER ADMIN ACCOUNT ALREADY created!");
		}
	} catch (error) {
		console.error("\n❌ Error creating SUPER ADMIN ACCOUNT:", error);
		throw error;
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {});

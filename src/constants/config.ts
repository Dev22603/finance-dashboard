import dotenv from "dotenv";
dotenv.config();

export const config = {
	// Application Environment
	PORT: process.env.PORT || 5000,
	NODE_ENV: process.env.NODE_ENV || "development",
	// API and Database URLs
	API_URL: process.env.API_URL || `http://localhost:${process.env.PORT}/api`,
	DB_USER: process.env.DB_USER || "postgres",
	DB_HOST: process.env.DB_HOST || "localhost",
	DB_NAME: process.env.DB_NAME || "budget",
	DB_PASSWORD: process.env.DB_PASSWORD || "root",
	DB_PORT: process.env.DB_PORT || 5432,
	DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/budget",

	// JWT Secret
	JWT_SECRET:
		process.env.JWT_SECRET || "jwt_secret",
};

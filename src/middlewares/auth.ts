// Backend\middlewares\auth.ts

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../constants/config";
import { ROLES } from "../constants/app.constants";
import { getLogger } from "../lib/logger";

const logger = getLogger("auth.middleware");

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) {
		logger.warn("Request rejected — no token provided", { path: req.path });
		return res.status(401).json({ error: "Access denied. No token provided." });
	}
	try {
		const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; name: string; role: ROLES };
		req.user = decoded;
		next();
	} catch (err) {
		logger.warn("Request rejected — invalid token", { path: req.path, error: (err as Error).message });
		res.status(400).json({ error: "Invalid token", err });
	}
};

export const authorize = (roles: ROLES[]) => (req: Request, res: Response, next: NextFunction) => {
	if (!roles.includes(req.user.role)) {
		logger.warn("Access forbidden — insufficient role", { path: req.path, userRole: req.user.role, requiredRoles: roles });
		return res.status(403).json({ error: "Forbidden. You do not have access." });
	}
	next();
};

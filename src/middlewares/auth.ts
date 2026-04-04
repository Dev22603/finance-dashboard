// Backend\middlewares\auth.ts

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../constants/config";
import { ROLES } from "../constants/app.constants";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) {
		return res.status(401).json({ error: "Access denied. No token provided." });
	}
	try {
		const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; name: string; role: ROLES };
		req.user = decoded;

		next();
	} catch (err) {
		res.status(400).json({ error: "Invalid token", err });
	}
};

export const authorize = (roles: ROLES[]) => (req: Request, res: Response, next: NextFunction) => {
	if (!roles.includes(req.user.role)) {
		return res.status(403).json({ error: "Forbidden. You do not have access." });
	}
	next();
};

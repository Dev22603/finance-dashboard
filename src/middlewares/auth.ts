// Backend\middlewares\auth.ts

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) {
		return res
			.status(401)
			.json({ error: "Access denied. No token provided." });
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded; // Attach user details to the request

		next();
	} catch (err) {
		res.status(400).json({ error: "Invalid token", err });
	}
};

export const authorize = (roles) => (req:Request, res:Response, next:NextFunction) => {
	if (!roles.includes(req.user.role)) {
		return res
			.status(403)
			.json({ error: "Forbidden. You do not have access." });
	}
	next();
};

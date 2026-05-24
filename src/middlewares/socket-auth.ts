import jwt from "jsonwebtoken";
import type { IncomingMessage } from "http";
import { config } from "../constants/config";
import { ROLES } from "../constants/app.constants";
import { ApiError } from "../utils/api_error";

export function parseUserFromRequest(req: IncomingMessage): { id: string; name: string; role: ROLES } {
	// Token is sent as the WebSocket subprotocol: new WebSocket(url, jwtToken)
	// This avoids query-param exposure in logs and browser history.
	const token = req.headers["sec-websocket-protocol"];
	if (!token) throw new Error("Authentication required");
	try {
		return jwt.verify(token, config.JWT_SECRET) as { id: string; name: string; role: ROLES };
	} catch {
		throw new Error("Invalid token");
	}
}

export function requireRole(user: { role: ROLES }, roles: ROLES[]) {
	if (!roles.includes(user.role)) {
		throw new ApiError(403, "Forbidden. You do not have access.");
	}
}

import type { WebSocket } from "ws";
import type { ROLES } from "../constants/app.constants";

export interface AuthenticatedWebSocket extends WebSocket {
	user: {
		id: string;
		name: string;
		role: ROLES;
	};
}

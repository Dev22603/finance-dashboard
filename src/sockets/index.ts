import type { Server as HttpServer } from "http";
import type { AuthenticatedWebSocket } from "../types/socket.d";
import { getWSS } from "../lib/realtime";
import { parseUserFromRequest } from "../middlewares/socket-auth";
import { handleGridConnection } from "./grid.gateway";
import { getLogger } from "../lib/logger";

const log = getLogger("ws.server");

export function registerSocketGateways(httpServer: HttpServer) {
	const wss = getWSS();

	httpServer.on("upgrade", (req, socket, head) => {
		const url = new URL(req.url ?? "/", "http://localhost");

		let user: AuthenticatedWebSocket["user"];
		try {
			user = parseUserFromRequest(req);
		} catch (err) {
			log.warn("WS upgrade rejected — auth failed", { path: url.pathname, error: (err as Error).message });
			socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
			socket.destroy();
			return;
		}

		if (url.pathname === "/grid") {
			wss.handleUpgrade(req, socket, head, (ws) => {
				const authWs = ws as AuthenticatedWebSocket;
				authWs.user = user;
				handleGridConnection(authWs);
			});
		} else {
			socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
			socket.destroy();
		}
	});
}

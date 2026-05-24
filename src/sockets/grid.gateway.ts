import { WebSocket } from "ws";
import type { AuthenticatedWebSocket } from "../types/socket.d";
import { gridService } from "../services/grid.services";
import { requireRole } from "../middlewares/socket-auth";
import { ROLES } from "../constants/app.constants";
import { SOCKET_EVENTS } from "../constants/socket.events";
import { setCellSchema } from "../schemas/grid.schemas";
import { ApiError } from "../utils/api_error";
import { getLogger } from "../lib/logger";

const log = getLogger("ws.grid");

// In-memory room — all connected grid clients
const gridClients = new Set<AuthenticatedWebSocket>();

function send(ws: AuthenticatedWebSocket, event: string, data: unknown) {
	ws.send(JSON.stringify({ event, data }));
}

function broadcast(event: string, data: unknown) {
	const msg = JSON.stringify({ event, data });
	for (const client of gridClients) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(msg);
		}
	}
}

export function handleGridConnection(ws: AuthenticatedWebSocket) {
	gridClients.add(ws);
	log.info("Client connected", { userId: ws.user.id });

	send(ws, SOCKET_EVENTS.GRID.SNAPSHOT, gridService.getGrid());

	ws.on("message", (raw) => {
		let parsed: { event: string; data: unknown };
		try {
			parsed = JSON.parse(raw.toString()) as { event: string; data: unknown };
		} catch {
			send(ws, SOCKET_EVENTS.GRID.ERROR, { code: 400, message: "Invalid JSON" });
			return;
		}
		dispatch(ws, parsed.event, parsed.data);
	});

	ws.on("close", () => {
		gridClients.delete(ws);
		log.info("Client disconnected", { userId: ws.user.id });
	});
}

function dispatch(ws: AuthenticatedWebSocket, event: string, data: unknown) {
	switch (event) {
		case SOCKET_EVENTS.GRID.SET_CELL:
			handleSetCell(ws, data);
			break;
		default:
			send(ws, SOCKET_EVENTS.GRID.ERROR, { code: 400, message: `Unknown event: ${event}` });
	}
}

function handleSetCell(ws: AuthenticatedWebSocket, data: unknown) {
	try {
		requireRole(ws.user, [ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPERADMIN]);
		const payload = setCellSchema.parse(data);
		const result = gridService.setCell(payload.x, payload.y, payload.value, ws.user.id);
		broadcast(SOCKET_EVENTS.GRID.CELL_UPDATED, result);
	} catch (err) {
		if (err instanceof ApiError) {
			send(ws, SOCKET_EVENTS.GRID.ERROR, { code: err.code, message: err.message });
			return;
		}
		log.error("setCell failed", { error: (err as Error).message });
		send(ws, SOCKET_EVENTS.GRID.ERROR, { code: 500, message: "Server error" });
	}
}

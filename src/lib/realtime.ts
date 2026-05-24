import { WebSocketServer } from "ws";

const globalForWSS = globalThis as typeof globalThis & { wss?: WebSocketServer };

export function createWSS(): WebSocketServer {
	if (globalForWSS.wss) return globalForWSS.wss;
	// noServer: true — we handle the HTTP upgrade event ourselves so we can
	// authenticate before the handshake completes and route by path.
	const wss = new WebSocketServer({
		noServer: true,
		// Client sends: new WebSocket(url, token)
		// Browser requires the server to echo back the accepted subprotocol, otherwise
		// it closes the connection. This handler echoes back whatever the client sent.
		handleProtocols: (protocols) => [...protocols][0] ?? false,
	});
	if (process.env.NODE_ENV !== "production") globalForWSS.wss = wss;
	return wss;
}

export function getWSS(): WebSocketServer {
	if (!globalForWSS.wss) throw new Error("WSS not initialized — call createWSS() first");
	return globalForWSS.wss;
}

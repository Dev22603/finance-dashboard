import { createServer } from "http";
import { app } from "./app";
import { config } from "./constants/config";
import logger from "./lib/logger";
import { createWSS } from "./lib/realtime";
import { registerSocketGateways } from "./sockets/index";

const httpServer = createServer(app);
createWSS();
registerSocketGateways(httpServer);

httpServer.listen(config.PORT, () => {
	logger.info(`Server is running on http://localhost:${config.PORT}`);
});

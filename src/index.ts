// index.ts
import { app } from "./app";
import { config } from "./constants/config";
import logger from "./lib/logger";

app.listen(config.PORT, () => {
	logger.info(`Server is running on http://localhost:${config.PORT}`);
});

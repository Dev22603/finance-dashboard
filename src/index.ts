// index.ts
import { app } from "./app";
import { config } from "./constants/config";
app.listen(config.PORT, () => {
	console.log(`Server is running on http://localhost:${config.PORT}`);
});

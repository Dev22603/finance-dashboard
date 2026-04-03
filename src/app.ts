// app.ts
import express from "express";

import cors from "cors";

const app = express();
app.use(
	cors({
		origin: "http://localhost:5173", // Allow this frontend origin
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
		credentials: true, // Allow credentials if needed
	}),
);
// Middleware
app.use(express.json());

app.get("/health", (req, res) => {
	res.status(200).json({ status: "Server is Up and Running!" });
});

export { app };

// routes/auth.routes.mjs

import express from "express";
import { signup, login } from "../controllers/auth.controllers";

const router = express.Router();

// Sign up route
router.post("/auth/signup", signup);

// Login route
router.post("/auth/login", login);

export default router;

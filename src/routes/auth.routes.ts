// routes/auth.routes.mjs

import express from "express";
import { signup, login } from "../controllers/auth.controllers";

const router = express.Router();

// Sign up route
router.post("/signup", signup);

// Login route
router.post("/login", login);

export default router;

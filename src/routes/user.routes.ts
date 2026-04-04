// routes/user.routes.mjs

import express from "express";
// import {} from "../controllers/user.controllers";
import { authenticate, authorize } from "../middlewares/auth";
import { ROLES } from "../constants/app.constants";

const router = express.Router();

// get all users route
router.get("/users", authenticate, authorize([ROLES.ADMIN]));


export default router;

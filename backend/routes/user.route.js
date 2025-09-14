import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/", verifyToken, createUser);
router.get("/", verifyToken, getUser);

export default router;

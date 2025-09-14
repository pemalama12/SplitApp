import express from "express";

import { verifyToken } from "../middleware/verifyToken.js";

import { deleteExpenses } from "../controllers/expense.controller.js/deleteExpenses.controller.js";
import { updateExpenses } from "../controllers/expense.controller.js/updateExpense.controller.js";

const router = express.Router();

router.delete("/:id/delete", verifyToken, deleteExpenses);
router.patch("/:id/update", verifyToken, updateExpenses);
// router.get("/", verifyToken, getUserGroups);

export default router;

import express from "express";

import { verifyToken } from "../middleware/verifyToken.js";
import { createGroup } from "../controllers/group.controller.js/createGroup.controller.js";
import { createExpense } from "../controllers/expense.controller.js/createExpense.controller.js";

import { updateGroup } from "../controllers/group.controller.js/updateGroup.controller.js";
import { deleteGroup } from "../controllers/group.controller.js/deleteGroup.controller.js";
import { deleteExpenses } from "../controllers/expense.controller.js/deleteExpenses.controller.js";

const router = express.Router();

router.post("/", verifyToken, createGroup);
router.post("/:groupId/expense", verifyToken, createExpense);

router.put("/:groupId/update", verifyToken, updateGroup);
router.delete("/:groupId/deleteGroup", verifyToken, deleteGroup);

// router.get("/", verifyToken, getUserGroups);

export default router;

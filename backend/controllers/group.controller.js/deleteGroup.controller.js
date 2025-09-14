import { StatusCodes } from "http-status-codes";

import { Group } from "../../models/group.model.js";
import { Expense } from "../../models/expenses.model.js";
import { Balance } from "../../models/balance.model.js";

export const deleteGroup = async (req, res) => {
  const groupId = req.params.groupId;

  try {
    await Balance.deleteMany({ groupId });
    await Expense.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "group deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message,
    });
  }
};

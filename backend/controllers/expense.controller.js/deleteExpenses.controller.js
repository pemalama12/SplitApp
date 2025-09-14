import { Balance } from "../../models/balance.model.js";
import { Expense } from "../../models/expenses.model.js";
import { StatusCodes } from "http-status-codes";

export const deleteExpenses = async (req, res) => {
  const { id } = req.params;
  console.log("expenses id", id);
  try {
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(StatusCodes.BAD_GATEWAY).json({
        message: "there is no expenses",
      });
    }

    console.log(expense);

    const { splitBetween, paidBy } = expense;

    if (splitBetween) {
      for (const user of splitBetween) {
        if (user.userId.toString() === paidBy.toString()) continue;

        const balance = await Balance.findOne({
          to: paidBy,
          from: user.userId,
        });

        console.log("balance", balance);
        console.log("userAmount", user.amount);
        if (balance) {
          balance.amount -= user.amount;
        }

        if (balance.amount === 0) {
          await Balance.findByIdAndDelete(balance._id);
          continue;
        }

        await balance.save();
      }
    }

    await Expense.findByIdAndDelete(id);

    return res.status(StatusCodes.OK).json({
      success: "true",
      message: "Expense deleted succesfully",
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_GATEWAY).json({
      success: "false",
      message: "error deleting expenses",
      error: error.message,
    });
  }
};

import { StatusCodes } from "http-status-codes";
import { Group } from "../../models/group.model.js";
import { Expense } from "../../models/expenses.model.js";
import { Balance } from "../../models/balance.model.js";

// Helper function to update balances using correct field names
async function updateBalance(groupId, debtor, creditor, amount) {
  try {
    let balance = await Balance.findOne({
      groupId,
      $or: [
        { from: debtor, to: creditor },
        { from: creditor, to: debtor },
      ],
    });

    console.log("Balance ", balance);

    if (balance) {
      if (balance.from.equals(debtor) && balance.to.equals(creditor)) {
        // Existing: debtor owes creditor (same direction)
        balance.amount = parseFloat((balance.amount + amount).toFixed(2));
        await balance.save();
      } else {
        // Existing: creditor owes debtor (opposite direction)
        balance.amount = parseFloat((balance.amount - amount).toFixed(2));

        if (balance.amount < 0) {
          // Debt direction reverses
          const newAmount = Math.abs(balance.amount);
          balance.from = debtor;
          balance.to = creditor;
          balance.amount = parseFloat(newAmount.toFixed(2));
          await balance.save();
        } else if (balance.amount === 0) {
          // Remove zero balance
          await Balance.findByIdAndDelete(balance._id);
        } else {
          // Update existing balance
          await balance.save();
        }
      }
    } else {
      const newBalance = new Balance({
        groupId,
        to: creditor,
        from: debtor,
        currency: "USD",
        amount,
        note: "update from expneses",
      });

      await newBalance.save();

      return newBalance;
    }
  } catch (error) {
    console.log("error", error);
    res.status(StatusCodes.BAD_GATEWAY).json({
      success: false,
      message: "Error creating a balance",
    });
  }
}

export const createExpense = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { description, amount, paidBy, splitBetween, date } = req.body;
    const expenseDate = date || Date.now();

    // Validation
    if (!description || !amount || !paidBy || !splitBetween) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Group existence check
    const existingGroup = await Group.findById(groupId);
    if (!existingGroup) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Group not found",
      });
    }

    // Calculate splits if not provided
    let finalSplit = splitBetween;

    const allAmountsMissing = splitBetween.every(
      (u) => typeof u.amount !== "number"
    );

    if (allAmountsMissing) {
      const members = splitBetween.map((u) => u.userId);
      const share = parseFloat((amount / members.length).toFixed(2));

      finalSplit = members.map((userId) => ({
        userId,
        amount: share,
      }));

      // Fix rounding issues
      const totalCalculated = finalSplit.reduce((sum, u) => sum + u.amount, 0);
      const diff = amount - totalCalculated;
      finalSplit[finalSplit.length - 1].amount += diff;
    }

    // Validate split total
    const totalSplit = finalSplit.reduce((sum, user) => sum + user.amount, 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Split amount mismatch. Total must be ${amount} (actual: ${totalSplit})`,
      });
    }

    // Create expense
    const newExpense = new Expense({
      description,
      amount,
      paidBy,
      groupId,
      date: expenseDate,
      splitBetween: finalSplit,
      createdBy: req.userId,
    });

    await newExpense.save();

    // Update balances

    const finalBalance = [];

    for (const split of finalSplit) {
      if (split.userId.toString() !== paidBy.toString()) {
        const singleBalance = await updateBalance(
          groupId,
          split.userId,
          paidBy,
          split.amount
        );
        // groupid userid paidby amount 6884e7f4bf93df86688c81f2 687e007d743f6c0b28ee5729 6884a8a8fe851f2a8d77e430 333
        // groupid userid paidby amount 6884e7f4bf93df86688c81f2 6887339e4d1b47dfa5749e6e 6884a8a8fe851f2a8d77e430 333

        console.log(
          "groupid userid paidby amount",
          groupId,
          split.userId,
          paidBy,
          split.amount
        );
        finalBalance.push(singleBalance ? singleBalance : 1);
      }
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Expense created successfully",
      expense: newExpense,
      finalBalance,
    });
  } catch (error) {
    console.log("createExpense error", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error creating expense",
      error: error.message,
    });
  }
};

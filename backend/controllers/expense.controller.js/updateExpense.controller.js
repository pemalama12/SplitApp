import { Balance } from "../../models/balance.model.js";
import { Expense } from "../../models/expenses.model.js";
import { StatusCodes } from "http-status-codes";

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

async function undoBalanceUpdate(oldExpenses) {
  const { amount, paidBy, splitBetween, groupId } = oldExpenses;

  for (const split of splitBetween) {
    if (split.userId.toString() != paidBy.toString()) {
      const balance = await Balance.findOne({
        from: split.userId,
        to: paidBy,
        groupId,
      });

      console.log("undo balance", balance, split.amount);

      if (!balance) {
        continue;
      } else if (balance) {
        console.log("balance spli share", balance.amount, split.amount);
        balance.amount -= split.amount;

        console.log("final undo balance", balance);
        await balance.save();
      } else if (balance.amount < 0) {
        await Balance.findByIdAndDelete(balance._id);
      } else {
        await balance.save();
      }
    }
  }

  try {
  } catch (error) {
    console.log(error.message);
    return res.status(StatusCodes.BAD_GATEWAY).json({
      success: false,
      message: " error in creating balance update",
    });
  }
}

export const updateExpenses = async (req, res) => {
  const { id } = req.params;

  const { description, amount, paidBy, splitBetween, date } = req.body;

  try {
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(StatusCodes.BAD_GATEWAY).json({
        message: "there is no expenses",
      });
    }

    console.log("split amount ", amount);
    await undoBalanceUpdate(expense);

    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (paidBy) expense.paidBy = paidBy;
    if (splitBetween) expense.splitBetween = splitBetween;

    if ((amount, splitBetween)) {
    }

    const expenseDate = date ? date : Date.now();

    let finalSplit = expense.splitBetween;

    const allAmountsMissing = expense.splitBetween.every(
      (u) => typeof u.amount !== "number"
    );

    if (allAmountsMissing) {
      const members = expense.splitBetween.map((u) => u.userId);
      const share = parseFloat((amount / members.length).toFixed(2));

      finalSplit = members.map((userId) => ({
        userId,
        amount: share,
      }));

      console.log("final split", finalSplit);

      // Fix rounding issues
      const totalCalculated = finalSplit.reduce((sum, u) => sum + u.amount, 0);
      const diff = amount - totalCalculated;
      finalSplit[finalSplit.length - 1].amount += diff;
    }

    console.log("final split", finalSplit);
    // Validate split total
    const totalSplit = finalSplit.reduce((sum, user) => sum + user.amount, 0);
    if (Math.abs(totalSplit - amount) > 0.01) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Split amount mismatch. Total must be ${amount} (actual: ${totalSplit}) ${amount}`,
      });
    }

    expense.splitBetween = finalSplit;

    await expense.save();

    // Create expense

    // Update balances

    const finalBalance = [];

    const groupId = expense.groupId;

    for (const split of finalSplit) {
      if (split.userId.toString() !== paidBy.toString()) {
        const singleBalance = await updateBalance(
          groupId,
          split.userId,
          expense.paidBy,
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

    return res.status(StatusCodes.OK).json({
      success: "true",
      message: "Expense updated succesfully",
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.BAD_GATEWAY).json({
      success: "false",
      message: "error updating expenses",
      error: error.message,
    });
  }
};

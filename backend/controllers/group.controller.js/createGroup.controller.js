import { StatusCodes } from "http-status-codes";
import { User } from "../../models/user.model.js";
import { Group } from "../../models/group.model.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    const { groupId } = req.params;

    console.log(groupId);
    if (!name || !members || members.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Name and members are required",
      });
    }

    const allMembers = members.includes(req.userId)
      ? members
      : [...members, req.userId];

    const newGroup = new Group({
      name,
      description,
      members: allMembers,
      createdBy: req.userId,
    });

    await newGroup.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (error) {
    console.log("create group error", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "erorr in creating group",
      error: error.message,
    });
  }
};

import { StatusCodes } from "http-status-codes";

import { Group } from "../../models/group.model.js";

export const updateGroup = async (req, res) => {
  try {
    const { newName, newMembers, newImage, newDescription } = req.body;

    const { groupId } = req.params;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(StatusCodes.BAD_GATEWAY).json({
        success: false,
        message: "there is no group",
      });
    }

    if (newName) group.name = newName;
    if (newImage) group.image = newImage;
    if (newDescription) group.description = newDescription;

    if (newMembers) {
      const exists = group.members.some(
        (member) => member.toString() === newMembers.toString()
      );

      if (exists) {
        return res.status(StatusCodes.BAD_GATEWAY).json({
          success: false,
          message: "there is already a user with same id",
        });
      }

      if (!exists) {
        group.members.push(newMembers);
      }
    }

    const newGroup = group;

    await newGroup.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Group updated successfully",
      group: newGroup,
    });
  } catch (error) {
    console.log("create group error", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "erorr in updating group",
      error: error.message,
    });
  }
};

const activityTaskService = require("../services/activity-task.service");
const { BadRequestError, NotFoundError } = require("../core/error.response");
const { SUCCESS, SuccessResponse } = require("../core/success.response");

const createActivityTask = async (req, res) => {
  try {
    const data = await activityTaskService.createActivityTask(req.body);
    res.status(201).json({
      status: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const updateActivityTaskStatus = async (req, res) => {
  try {
    const data = await activityTaskService.updateActivityTaskStatus(
      req.params.id,
      req.body.status,
    );
    return new SuccessResponse({
      message: "Task status updated successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const updateActivityTask = async (req, res, next) => {
  try {
    const { activityId, taskId } = req.params;

    // Call service to perform update
    const updatedTask = await activityTaskService.updateActivityTask(
      taskId,
      activityId,
      req.body,
    );

    if (!updatedTask) {
      throw new NotFoundError(
        `Task with ID ${taskId} not found in Activity ${activityId}`,
      );
    }

    return new SuccessResponse({
      message: "Task updated successfully",
      metaData: updatedTask,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
  updateActivityTask,
};

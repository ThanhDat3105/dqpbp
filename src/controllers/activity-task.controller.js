const activityTaskService = require("../services/activity-task.service");

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
    res.status(200).json({
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

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
};

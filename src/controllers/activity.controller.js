const activityService = require("../services/activity.service");

const getActivities = async (req, res) => {
  try {
    const data = await activityService.getActivities();
    res.json({
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

const getActivityById = async (req, res) => {
  try {
    const data = await activityService.getActivityById(req.params.id);
    res.json({
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

const createActivity = async (req, res) => {
  try {
    const data = await activityService.createActivity(req.body);
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

module.exports = {
  getActivities,
  createActivity,
  getActivityById,
};

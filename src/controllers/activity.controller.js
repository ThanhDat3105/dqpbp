const activityService = require("../services/activity.service");
const pick = require("../utils/pick");

const getActivities = async (req, res, user) => {
  try {
    console.log(req.headers.authorization);

    const filter = pick(req.query, ["month", "year"]);
    const option = pick(req.query, ["page", "limit"]);
    const data = await activityService.getActivities(filter, option);
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

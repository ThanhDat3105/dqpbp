const { SuccessResponse } = require("../core/success.response");
const { ErrorResponse } = require("../core/error.response");
const activityService = require("../services/activity.service");
const pick = require("../utils/pick");

const getActivities = async (req, res, next) => {
  try {
    const filter = pick(req.query, ["month", "year"]);
    const option = pick(req.query, ["page", "limit"]);
    const data = await activityService.getActivities(filter, option);
    return new SuccessResponse({
      message: "Activities retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const getActivityById = async (req, res, next) => {
  try {
    const data = await activityService.getActivityById(req.params.id);
    return new SuccessResponse({
      message: "Activity retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const createActivity = async (req, res, next) => {
  try {
    const data = await activityService.createActivity(req.body);
    return new SuccessResponse({
      message: "Activity created successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivities,
  createActivity,
  getActivityById,
};

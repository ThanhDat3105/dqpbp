"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const activityService = require("../services/activity.service");

/**
 * GET /api/activities
 * Query params: status, from_date, to_date, month, year, page, limit
 */
const getActivities = async (req, res, next) => {
  try {
    const { month, year, status, from_date, to_date, page, limit } = req.query;

    const filter = { month, year, status, from_date, to_date };
    const option = { page, limit };

    const data = await activityService.getActivities(filter, option);
    return new SuccessResponse({
      message: "Activities retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/activities/:id
 */
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

/**
 * POST /api/activities
 */
const createActivity = async (req, res, next) => {
  try {
    const data = await activityService.createActivity(req.body);
    return new CREATED({
      message: "Activity created successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = { getActivities, getActivityById, createActivity };

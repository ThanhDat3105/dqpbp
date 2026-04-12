"use strict";

const { SuccessResponse } = require("../core/success.response");
const scheduleService = require("../services/schedule.service");
const scheduleValidation = require("../validations/schedule.validation");

const getWeekly = async (req, res, next) => {
  try {
    const { error, value } = scheduleValidation.getWeekly.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: "VALIDATION_FAILED"
      });
    }

    const { week_start } = value;

    const reqDate = new Date(week_start);
    if (reqDate.getUTCDay() !== 1) {
      return res.status(400).json({
        success: false,
        error: "week_start must be a Monday",
        code: "INVALID_WEEK_START"
      });
    }

    const data = await scheduleService.getWeeklySchedule(week_start);

    return new SuccessResponse({
      message: "Get weekly schedule successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error)
  }
};

const upsertTemplate = async (req, res) => {
  try {
    const { error, value } = scheduleValidation.upsertTemplate.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message.replace(/\"/g, ''),
        code: "VALIDATION_FAILED"
      });
    }

    const { user_id } = value;

    const exists = await scheduleService.checkUserExists(user_id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: "user_id does not exist",
        code: "USER_NOT_FOUND"
      });
    }

    const updated = await scheduleService.upsertTemplate(value);
    res.json({ success: true, updated_at: updated.updated_at || new Date().toISOString() });
  } catch (error) {
    console.error(error);
    if (error.code && error.code === '23503') {
      return res.status(404).json({
        success: false,
        error: "user_id does not exist",
        code: "USER_NOT_FOUND"
      });
    }
    res.status(500).json({
      success: false,
      error: "Database error",
      code: "DATABASE_ERROR"
    });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { error, value } = scheduleValidation.deleteTemplate.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message.replace(/\"/g, ''),
        code: "VALIDATION_FAILED"
      });
    }

    await scheduleService.deleteTemplate(value);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Database error",
      code: "DATABASE_ERROR"
    });
  }
};

const updateMobilize = async (req, res) => {
  try {
    const { error, value } = scheduleValidation.updateMobilize.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message.replace(/\"/g, ''),
        code: "VALIDATION_FAILED"
      });
    }

    const { user_id, week_start } = value;

    const reqDate = new Date(week_start);
    if (reqDate.getUTCDay() !== 1) {
      return res.status(400).json({
        success: false,
        error: "week_start must be a Monday",
        code: "INVALID_WEEK_START"
      });
    }

    const exists = await scheduleService.checkUserExists(user_id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: "user_id does not exist",
        code: "USER_NOT_FOUND"
      });
    }

    await scheduleService.updateMobilize(value);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Database error",
      code: "DATABASE_ERROR"
    });
  }
};

module.exports = {
  getWeekly,
  upsertTemplate,
  deleteTemplate,
  updateMobilize
};

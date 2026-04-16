"use strict";

const Joi = require("joi");

const customTimeFormat = (value, helpers) => {
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const getWeekly = Joi.object({
  week_start: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "week_start must be in YYYY-MM-DD format",
      "any.required": "week_start is required",
    }),
  user_id: Joi.number().integer().required(),
  unit_filter: Joi.string().allow(null, ""),
});

const upsertTemplate = Joi.object({
  user_id: Joi.number().integer().required(),
  day_of_week: Joi.number().integer().min(1).max(7).required(),
  shift: Joi.string().valid("SANG", "CHIEU", "DEM").required(),
  start_time: Joi.string().custom(customTimeFormat).required(),
  end_time: Joi.string().custom(customTimeFormat).required(),
  note: Joi.string().allow(null, ""),
}).custom((value, helpers) => {
  const start = new Date(`1970-01-01T${value.start_time}:00`);
  const end = new Date(`1970-01-01T${value.end_time}:00`);
  if (end <= start) {
    return helpers.message("end_time must be strictly greater than start_time");
  }
  return value;
});

const deleteTemplate = Joi.object({
  user_id: Joi.number().integer().required(),
  day_of_week: Joi.number().integer().min(1).max(7).required(),
  shift: Joi.string().valid("SANG", "CHIEU", "DEM").required(),
});

const updateMobilize = Joi.object({
  user_id: Joi.number().integer().required(),
  week_start: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "week_start must be in YYYY-MM-DD format",
      "any.required": "week_start is required",
    }),
  mobilize_count: Joi.number().integer().min(0).required(),
});

const scheduleItem = Joi.object({
  day_of_week: Joi.number().integer().min(1).max(7).required(),
  shift: Joi.string().valid("SANG", "CHIEU", "DEM").required(),
  start_time: Joi.string().custom(customTimeFormat).required(),
  end_time: Joi.string().custom(customTimeFormat).required(),
  day_of_week: Joi.number().integer().min(1).max(5).required().messages({
    "number.min": "Chỉ được phép đăng ký từ Thứ 2 đến Thứ 6",
    "number.max": "Chỉ được phép đăng ký từ Thứ 2 đến Thứ 6"
  }),
  note: Joi.string().allow(null, "")
}).custom((value, helpers) => {
  const start = new Date(`1970-01-01T${value.start_time}:00`);
  const end = new Date(`1970-01-01T${value.end_time}:00`);
  if (end <= start) return helpers.message("end_time must be > start_time");
  return value;
});

const registerSchedule = Joi.object({
  user_id: Joi.number().integer().required(),
  week_start: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // Bắt buộc có tuần
  schedules: Joi.array().items(scheduleItem).required()
});

module.exports = {
  getWeekly,
  upsertTemplate,
  deleteTemplate,
  updateMobilize,
  registerSchedule
};

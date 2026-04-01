"use strict";

const Joi = require("joi");

const getCalendar = {
  query: Joi.object().keys({
    view: Joi.string()
      .valid("day", "week", "month")
      .required()
      .messages({
        "any.only": "view must be one of: day, week, month",
        "any.required": "view is required",
      }),
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "date must be in YYYY-MM-DD format",
        "any.required": "date is required",
      }),
  }),
};

module.exports = {
  getCalendar,
};

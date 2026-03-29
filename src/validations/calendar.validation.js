"use strict";

const Joi = require("joi");

const getCalendar = {
  query: Joi.object().keys({
    month: Joi.string()
      .pattern(/^\d{4}-\d{2}$/)
      .required()
      .messages({
        "string.pattern.base": "month must be in YYYY-MM format",
        "any.required": "month query parameter is required",
      }),
  }),
};

module.exports = {
  getCalendar,
};

"use strict";

const Joi = require("joi");

const getCalendar = {
  query: Joi.object().keys({
    month: Joi.string()
      .pattern(/^\d{4}-\d{2}$/)
      .messages({
        "string.pattern.base": "month must be in YYYY-MM format",
      }),
  }),
};

module.exports = {
  getCalendar,
};

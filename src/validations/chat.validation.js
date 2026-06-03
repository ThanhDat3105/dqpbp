"use strict";

const Joi = require("joi");

const chatValidation = {
  body: Joi.object().keys({
    message: Joi.string().trim().min(1).max(4000).required().messages({
      "string.empty": "message is required",
      "any.required": "message is required",
    }),
  }),
};

module.exports = {
  chatValidation,
};

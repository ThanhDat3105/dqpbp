"use strict";

const Joi = require("joi");

const optionalText = (max = 100) =>
  Joi.alternatives()
    .try(Joi.string().max(max), Joi.number())
    .optional()
    .allow("", null)
    .custom((value) => (value == null || value === "" ? value : String(value)));

module.exports = { optionalText };

"use strict";

const Joi = require("joi");

const createActivityTask = {
  body: Joi.object().keys({
    activity_id: Joi.number().integer().required(),
    title: Joi.string().max(255).required(),
    team: Joi.string().max(100).required(),
    assignees: Joi.array().items(Joi.string()).required(),
    dueDate: Joi.string().required(),
    notes: Joi.string().allow("", null),
    reportFields: Joi.array().items(
      Joi.object({
        name: Joi.string(),
        value: Joi.string(),
      }),
    ),
    accepted_at: Joi.date().allow(null),
    created_at: Joi.date().default(() => new Date(), new Date()),
    updated_at: Joi.date().default(() => new Date(), new Date()),
  }),
};

const updateActivityTaskStatus = {
  body: Joi.object().keys({
    status: Joi.string().max(50),
  }),
};

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
};

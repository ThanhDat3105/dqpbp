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

const updateActivityTask = {
  body: Joi.object()
    .keys({
      title: Joi.string().max(255),
      team: Joi.string().max(100),
      assignees: Joi.array().items(Joi.string()),
      due_date: Joi.date().allow(null),
      report_fields: Joi.array()
        .items(
          Joi.object({
            name: Joi.string(),
            value: Joi.string(),
          }),
        )
        .allow(null),
      notes: Joi.string().allow("", null),
      completed: Joi.boolean(),
      status: Joi.string().valid("pending", "in_progress", "completed"),
      completed_at: Joi.date().allow(null),
      accepted_at: Joi.date().allow(null),
    })
    .min(1), // At least one field must be provided
};

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
  updateActivityTask,
};

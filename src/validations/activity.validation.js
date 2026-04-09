"use strict";

const Joi = require("joi");
const { WORK_TYPE } = require("../constant/activity.constant");

const createActivity = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    work_type: Joi.string()
      .valid(...Object.values(WORK_TYPE))
      .required(),
    department: Joi.string()
      .valid(
        "administration_office",
        "planning",
        "political_affairs",
        "logistics",
        "mobilization_recruitment",
      )
      .required(),
    location: Joi.string(),
    document_number: Joi.string().allow("", null),
    status: Joi.string()
      .valid("pending", "in_progress", "completed")
      .default("pending"),
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    tasks: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().max(255).required(),
          team: Joi.string().max(100).required(),
          assignees: Joi.array().items(Joi.string()).required(),
          status: Joi.string()
            .valid("pending", "in_progress", "completed")
            .default("pending"),
          completed: Joi.boolean().default(false),
          due_date: Joi.string().required(),
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
      )
      .default([]),
    created_by: Joi.string().required(),
    created_at: Joi.date().default(() => new Date(), new Date()),
    updated_at: Joi.date().default(() => new Date(), new Date()),
  }),
};

const getActivities = {
  query: Joi.object()
    .keys({
      month: Joi.number().integer().min(1).max(12),
      year: Joi.number().integer(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
    })
    .with("month", "year")
    .messages({
      "object.with": "month requires year",
    }),
};

module.exports = {
  createActivity,
  getActivities,
};

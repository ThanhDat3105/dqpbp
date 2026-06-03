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
        "advise",
        "political_affairs",
        "logistics",
        "mobilization_recruitment",
      )
      .required(),
    location: Joi.string().allow("", null),
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
          team: Joi.array().items(Joi.string()).min(1).required(),
          assignees: Joi.array().items(Joi.string()).required(),
          status: Joi.string()
            .valid("pending", "in_progress", "completed")
            .default("pending"),
          completed: Joi.boolean().default(false),
          start_date: Joi.date().required(),
          due_date: Joi.string().required(),
          notes: Joi.string().allow("", null),
          reportFields: Joi.array().items(
            Joi.object({
              name: Joi.string(),
              value: Joi.string(),
            }),
          ),
          requires_dqcd: Joi.boolean().default(false),
          accepted_at: Joi.date().allow(null),
          created_at: Joi.date().default(() => new Date(), new Date()),
          updated_at: Joi.date().default(() => new Date(), new Date()),
        }),
      )
      .default([]),
    created_by: Joi.alternatives([Joi.string(), Joi.number()]).required(),
    created_at: Joi.date().default(() => new Date(), new Date()),
    updated_at: Joi.date().default(() => new Date(), new Date()),
  }),
};

const ACTIVITY_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "overdue",
];

const getActivities = {
  query: Joi.object()
    .keys({
      // ─── Legacy calendar filters
      month: Joi.number().integer().min(1).max(12),
      year: Joi.number().integer(),

      // ─── Status filter
      status: Joi.string()
        .valid(...ACTIVITY_STATUSES)
        .messages({
          "any.only": `status must be one of: ${ACTIVITY_STATUSES.join(", ")}`,
        }),

      // ─── Date range filters (ISO: YYYY-MM-DD)
      from_date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .messages({
          "string.pattern.base":
            "from_date must be a valid ISO date (YYYY-MM-DD)",
        }),
      to_date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .messages({
          "string.pattern.base":
            "to_date must be a valid ISO date (YYYY-MM-DD)",
        }),

      // ─── Pagination
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

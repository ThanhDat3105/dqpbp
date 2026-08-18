"use strict";

const Joi = require("joi");
const { WORK_TYPE } = require("../constant/activity.constant");

const departmentSchema = Joi.string().valid(
  "administration_office",
  "advise",
  "political_affairs",
  "logistics",
  "mobilization_recruitment",
);

const taskSchema = Joi.object({
  title: Joi.string().max(255).required(),
  team: Joi.array().items(Joi.string()).min(1).required(),
  assignees: Joi.array().items(Joi.number().integer().positive()).default([]),
  notes: Joi.string().allow("", null),
  report_fields: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().allow("", null),
        value: Joi.string().allow("", null),
      }).unknown(true),
    ),
  reportFields: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().allow("", null),
        value: Joi.string().allow("", null),
      }).unknown(true),
    ),
  requires_dqcd: Joi.boolean().default(false),
  require_media_report: Joi.boolean().default(false),
  display_order: Joi.number().integer().min(0).default(0),
});

const idParam = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const getTemplates = {
  query: Joi.object({
    search: Joi.string().allow("", null),
    status: Joi.string().valid("active", "inactive").default("active"),
    work_type: Joi.string().valid(...Object.values(WORK_TYPE)),
    department: departmentSchema,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const createTemplate = {
  body: Joi.object({
    name: Joi.string().max(255).required(),
    description: Joi.string().allow("", null),
    work_type: Joi.string().valid(...Object.values(WORK_TYPE)).allow(null),
    department: departmentSchema.allow(null),
    location: Joi.string().allow("", null),
    document_number: Joi.string().allow("", null),
    status: Joi.string().valid("active", "inactive").default("active"),
    tasks: Joi.array().items(taskSchema).min(1).required(),
  }),
};

const updateTemplate = {
  ...idParam,
  body: Joi.object({
    name: Joi.string().max(255),
    description: Joi.string().allow("", null),
    work_type: Joi.string().valid(...Object.values(WORK_TYPE)).allow(null),
    department: departmentSchema.allow(null),
    location: Joi.string().allow("", null),
    document_number: Joi.string().allow("", null),
    status: Joi.string().valid("active", "inactive"),
    tasks: Joi.array().items(taskSchema).min(1),
  }).min(1),
};

const createActivityFromTemplate = {
  ...idParam,
  body: Joi.object({
    name: Joi.string().max(255).required(),
    work_type: Joi.string().valid(...Object.values(WORK_TYPE)),
    department: departmentSchema,
    location: Joi.string().allow("", null),
    document_number: Joi.string().allow("", null),
    status: Joi.string()
      .valid("pending", "in_progress", "completed")
      .default("pending"),
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    created_by: Joi.alternatives([Joi.string(), Joi.number()]),
  }),
};

const createTemplateFromActivity = {
  params: Joi.object({
    activityId: Joi.number().integer().positive().required(),
  }),
  body: Joi.object({
    name: Joi.string().max(255),
    description: Joi.string().allow("", null),
    status: Joi.string().valid("active", "inactive").default("active"),
  }),
};

module.exports = {
  getTemplates,
  getTemplateById: idParam,
  createTemplate,
  updateTemplate,
  deleteTemplate: idParam,
  createActivityFromTemplate,
  createTemplateFromActivity,
};

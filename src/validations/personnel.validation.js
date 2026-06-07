"use strict";

const Joi = require("joi");

const VALID_TEAMS = [
  "administration_office",
  "advise",
  "political_affairs",
  "logistics",
  "mobilization_recruitment",
];

const VALID_STATUSES = ["on_duty", "training", "on_leave", "other"];

const VALID_ROLES = ["CHI_HUY", "TO_TRUONG", "DQTT", "DQCD"];

// GET /api/personnel/list
const getPersonnelList = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    // department validated against DB — invalid code → 400 from service
    department: Joi.string().valid(...VALID_TEAMS),
    status: Joi.string().valid(...VALID_STATUSES),
    role: Joi.string().valid(...VALID_ROLES),
  }),
};

// PATCH /api/personnel/:id/status
const updateStatus = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object().keys({
    status: Joi.string()
      .valid(...VALID_STATUSES)
      .required()
      .messages({
        "any.only": `status phải là một trong: ${VALID_STATUSES.join(", ")}`,
        "any.required": "status là bắt buộc",
      }),
  }),
};

module.exports = { getPersonnelList, updateStatus, VALID_TEAMS, VALID_STATUSES };

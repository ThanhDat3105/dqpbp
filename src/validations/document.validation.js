"use strict";

const Joi = require("joi");

const getList = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(255).allow("", null).optional(),
    department_id: Joi.number().integer().positive().allow(null).optional(),
    departmentId: Joi.number().integer().positive().allow(null).optional(),
    department_code: Joi.string().max(50).allow("", null).optional(),
    departmentCode: Joi.string().max(50).allow("", null).optional(),
    is_public: Joi.boolean().optional(),
    isPublic: Joi.boolean().optional(),
  }),
};

const upload = {
  body: Joi.object().keys({
    title: Joi.string().max(255).allow("", null).optional(),
    description: Joi.string().allow("", null).optional(),
    department_id: Joi.number().integer().positive().optional(),
    departmentId: Joi.number().integer().positive().optional(),
    is_public: Joi.boolean().default(false).optional(),
    isPublic: Joi.boolean().optional(),
  }),
};

module.exports = {
  getList,
  upload,
};

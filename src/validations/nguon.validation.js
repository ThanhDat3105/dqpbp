"use strict";

const Joi = require("joi");

const VALID_EDUCATION = ["THCS", "THPT", "Trung cấp", "Cao đẳng", "Đại học", "Khác"];

const getList = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(100).allow("", null).optional(),
  }),
};

const getById = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
};

const create = {
  body: Joi.object().keys({
    full_name: Joi.string().max(100).required().messages({
      "any.required": "full_name là bắt buộc",
      "string.empty": "full_name không được để trống",
    }),
    date_of_birth: Joi.date().required().messages({
      "any.required": "date_of_birth là bắt buộc",
    }),
    permanent_address: Joi.string().max(255).optional().allow("", null),
    temporary_address: Joi.string().max(255).optional().allow("", null),
    phone: Joi.string()
      .pattern(/^0\d{9}$/)
      .optional()
      .allow("", null)
      .messages({ "string.pattern.base": "phone phải gồm 10 chữ số và bắt đầu bằng 0" }),
    education_level: Joi.string().valid(...VALID_EDUCATION).optional().allow(null),
    youth_personnel_id: Joi.number().integer().positive().optional().allow(null),
    note: Joi.string().max(500).optional().allow("", null),
  }),
};

const update = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object()
    .keys({
      full_name: Joi.string().max(100).optional(),
      date_of_birth: Joi.date().optional(),
      permanent_address: Joi.string().max(255).optional().allow("", null),
      temporary_address: Joi.string().max(255).optional().allow("", null),
      phone: Joi.string()
        .pattern(/^0\d{9}$/)
        .optional()
        .allow("", null)
        .messages({ "string.pattern.base": "phone phải gồm 10 chữ số và bắt đầu bằng 0" }),
      education_level: Joi.string().valid(...VALID_EDUCATION).optional().allow(null),
      note: Joi.string().max(500).optional().allow("", null),
    })
    .min(1)
    .messages({ "object.min": "Phải cung cấp ít nhất một trường để cập nhật" }),
};

const remove = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
};

module.exports = { getList, getById, create, update, remove };

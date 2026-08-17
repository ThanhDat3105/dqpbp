"use strict";

const Joi = require("joi");
const { optionalText, optionalAddressCoords } = require("./helpers");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

// Business Rule #2: tuổi 15–19 tính theo năm sinh
const minDob = new Date(`${currentYear - 19}-01-01`);
const maxDob = new Date(`${currentYear - 15}-12-31`);

const VALID_EDUCATION = [
  "THCS",
  "THPT",
  "Trung cấp",
  "Cao đẳng",
  "Đại học",
  "Khác",
];

// ─── GET /api/youth/list ──────────────────────────────────────────────────────
const getList = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(100).allow("", null).optional(),
    is_registered: Joi.boolean().optional(),
  }),
};

// ─── GET /api/youth/:id ───────────────────────────────────────────────────────
const getById = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
};

// ─── POST /api/youth ──────────────────────────────────────────────────────────
const create = {
  body: Joi.object().keys({
    full_name: Joi.string().max(100).required().messages({
      "any.required": "full_name là bắt buộc",
      "string.empty": "full_name không được để trống",
    }),
    date_of_birth: Joi.date()
      .min(minDob)
      .max(maxDob)
      .required()
      .messages({
        "any.required": "date_of_birth là bắt buộc",
        "date.min": `date_of_birth phải trong khoảng 15–19 tuổi (sinh từ ${minDob.getFullYear()} đến ${maxDob.getFullYear()})`,
        "date.max": `date_of_birth phải trong khoảng 15–19 tuổi (sinh từ ${minDob.getFullYear()} đến ${maxDob.getFullYear()})`,
      }),
    permanent_address: Joi.string().max(255).optional().allow("", null),
    temporary_address: Joi.string().max(255).optional().allow("", null),
    ...optionalAddressCoords,
    neighborhood: optionalText(100),
    // Business Rule #3: phone 10 số, bắt đầu 0
    phone: Joi.string()
      .pattern(/^0\d{9}$/)
      .optional()
      .allow("", null)
      .messages({
        "string.pattern.base": "phone phải gồm 10 chữ số và bắt đầu bằng 0",
      }),
    education_level: Joi.string()
      .valid(...VALID_EDUCATION)
      .optional()
      .allow(null),
    is_registered: Joi.boolean().default(false),
  }),
};

// ─── PUT /api/youth/:id ───────────────────────────────────────────────────────
const update = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
  body: Joi.object()
    .keys({
      full_name: Joi.string().max(100).optional(),
      date_of_birth: Joi.date().min(minDob).max(maxDob).optional().messages({
        "date.min": `date_of_birth phải trong khoảng 15–19 tuổi`,
        "date.max": `date_of_birth phải trong khoảng 15–19 tuổi`,
      }),
      permanent_address: Joi.string().max(255).optional().allow("", null),
      temporary_address: Joi.string().max(255).optional().allow("", null),
      ...optionalAddressCoords,
      neighborhood: optionalText(100),
      phone: Joi.string()
        .pattern(/^0\d{9}$/)
        .optional()
        .allow("", null)
        .messages({
          "string.pattern.base": "phone phải gồm 10 chữ số và bắt đầu bằng 0",
        }),
      education_level: Joi.string()
        .valid(...VALID_EDUCATION)
        .optional()
        .allow(null),
      is_registered: Joi.boolean().optional(),
    })
    .min(1) // phải gửi lên ít nhất 1 field
    .messages({
      "object.min": "Phải cung cấp ít nhất một trường để cập nhật",
    }),
};

// ─── DELETE /api/youth/:id ────────────────────────────────────────────────────
const remove = {
  params: Joi.object().keys({
    id: Joi.number().integer().positive().required(),
  }),
};

module.exports = { getList, getById, create, update, remove };

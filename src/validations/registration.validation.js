"use strict";

const Joi = require("joi");
const {
  REGISTRATION_CATEGORIES,
  VN_PHONE_PATTERN,
} = require("../constant/registration.constant");

const vnPhone = Joi.string()
  .pattern(VN_PHONE_PATTERN)
  .required()
  .messages({
    "string.pattern.base":
      "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0",
    "any.required": "Số điện thoại là bắt buộc",
  });

const createRegistration = {
  body: Joi.object()
    .keys({
      category: Joi.string()
        .valid(...REGISTRATION_CATEGORIES)
        .required()
        .messages({
          "any.only": `category phải là một trong: ${REGISTRATION_CATEGORIES.join(", ")}`,
          "any.required": "category là bắt buộc",
        }),
      full_name: Joi.string().trim().min(2).max(200).required().messages({
        "any.required": "full_name là bắt buộc",
      }),
      phone: vnPhone,
      address: Joi.string().trim().min(5).max(500).required().messages({
        "any.required": "address là bắt buộc",
      }),
      dob: Joi.date().iso().max("now").required().messages({
        "date.format": "dob phải đúng định dạng ngày (YYYY-MM-DD)",
        "any.required": "dob là bắt buộc",
      }),
      workplace: Joi.string().trim().min(2).max(300).required().messages({
        "any.required": "workplace là bắt buộc",
      }),
      guardian_phone: vnPhone.messages({
        "any.required": "guardian_phone là bắt buộc",
      }),
      captcha_token: Joi.string().trim().required().messages({
        "any.required": "captcha_token là bắt buộc",
      }),
    })
    .unknown(false),
};

const listTemplates = {
  query: Joi.object().keys({
    category: Joi.string()
      .valid(...REGISTRATION_CATEGORIES)
      .optional()
      .messages({
        "any.only": `category phải là một trong: ${REGISTRATION_CATEGORIES.join(", ")}`,
      }),
  }),
};

const listRegistrations = {
  query: Joi.object()
    .keys({
      category: Joi.string()
        .valid(...REGISTRATION_CATEGORIES)
        .optional()
        .messages({
          "any.only": `category pháº£i lĂ  má»™t trong: ${REGISTRATION_CATEGORIES.join(", ")}`,
        }),
      full_name: Joi.string().trim().max(200).optional(),
      phone: Joi.string().trim().max(20).optional(),
      address: Joi.string().trim().max(500).optional(),
    })
    .unknown(false),
};

module.exports = { createRegistration, listTemplates, listRegistrations };

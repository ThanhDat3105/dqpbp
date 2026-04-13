"use strict";

const Joi = require("joi");

const ROLES = ["DQTT", "CHI_HUY"];

const register = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(100).required().messages({
      "string.min": "name must be at least 2 characters",
      "any.required": "name is required",
    }),
    email: Joi.string().trim().email().lowercase().required().messages({
      "string.email": "email must be a valid email address",
      "any.required": "email is required",
    }),
    password: Joi.string().min(6).max(72).required().messages({
      "string.min": "password must be at least 6 characters",
      "any.required": "password is required",
    }),
    team: Joi.string().trim().max(100).required().messages({
      "any.required": "team is required",
    }),
    role: Joi.string()
      .valid(...ROLES)
      .required()
      .messages({
        "any.only": `role must be one of: ${ROLES.join(", ")}`,
        "any.required": "role is required",
      }),
    // Optional profile fields
    phone: Joi.string().trim().max(20).allow("", null),
    address: Joi.string().trim().max(255).allow("", null),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().trim().email().lowercase().required().messages({
      "string.email": "Invalid credentials",
      "any.required": "email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Invalid credentials",
      "any.required": "password is required",
    }),
  }),
};

const refreshToken = {
  body: Joi.object().keys({
    refresh_token: Joi.string().required().messages({
      "any.required": "refresh_token is required",
    }),
  }),
};

module.exports = { register, login, refreshToken };

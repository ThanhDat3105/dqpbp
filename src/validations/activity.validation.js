"use strict";

const Joi = require("joi");
const { WORK_TYPE } = require("../constant/activity.constant");

const createActivity = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    work_type: Joi.string()
      .valid(...Object.values(WORK_TYPE))
      .required(),
    department: Joi.string().required(),
    start_date: Joi.date().required(),
    end_date: Joi.date().required(),
    location: Joi.string().required(),
    document_number: Joi.string().required(),
    attached_files: Joi.array().items(Joi.string()),
    created_by: Joi.string().required(),
    created_at: Joi.date().default(() => new Date(), new Date()),
    updated_at: Joi.date().default(() => new Date(), new Date()),
  }),
};

module.exports = {
  createActivity,
};

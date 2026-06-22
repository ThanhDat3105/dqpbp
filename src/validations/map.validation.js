"use strict";

const Joi = require("joi");
const { optionalText } = require("./helpers");

const getNhanSu = {
  query: Joi.object().keys({
    type: Joi.string()
      .valid("dqcd", "quan_nhan_du_bi", "tuoi_17")
      .optional()
      .messages({
        "any.only": "type phải là dqcd, quan_nhan_du_bi hoặc tuoi_17",
      }),
    neighborhood: optionalText(100),
  }),
};

module.exports = {
  getNhanSu,
};

"use strict";

const Joi = require("joi");

const getNhanSu = {
  query: Joi.object().keys({
    loai: Joi.string()
      .valid("dqcd", "quan_nhan_du_bi", "tuoi_17")
      .optional()
      .messages({
        "any.only": "loai phải là dqcd, quan_nhan_du_bi hoặc tuoi_17",
      }),
    khu_pho: Joi.string().trim().max(100).optional(),
  }),
};

module.exports = {
  getNhanSu,
};

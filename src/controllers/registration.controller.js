"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const { ForbiddenError } = require("../core/error.response");
const captchaService = require("../services/captcha.service");
const registrationService = require("../services/registration.service");
const registrationTemplateService = require("../services/registration-template.service");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const create = async (req, res, next) => {
  try {
    const { captcha_token, ...registrationData } = req.body;
    const clientIp = getClientIp(req);

    const captchaValid = await captchaService.verifyCaptcha(
      captcha_token,
      clientIp,
    );

    if (!captchaValid) {
      return next(new ForbiddenError("Captcha không hợp lệ"));
    }

    const registration = await registrationService.create(
      registrationData,
      clientIp,
    );

    // todo: notify staff
    // registrationService.notifyStaff({
    //   id: registration.id,
    //   category: registration.category,
    //   full_name: registrationData.full_name,
    // });

    return new CREATED({
      message: "Đăng ký thành công",
      metaData: {
        id: registration.id,
        category: registration.category,
        status: registration.status,
        created_at: registration.created_at,
      },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const data = await registrationService.list(req.query);

    return new SuccessResponse({
      message: "Lấy danh sách thành công",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const listTemplates = async (req, res, next) => {
  try {
    const data = await registrationTemplateService.listByCategory(
      req.query.category,
    );

    return new SuccessResponse({
      message: "Lấy danh sách biểu mẫu thành công",
      metaData: { data },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = { create, list, listTemplates };

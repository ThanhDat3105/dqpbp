"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const { ForbiddenError } = require("../core/error.response");
const captchaService = require("../services/captcha.service");
const contactService = require("../services/website-contact.service");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const handleServerError = (res) =>
  res.status(500).json({ message: "Lỗi server" });

const create = async (req, res, next) => {
  try {
    const { captcha_token, ...contactData } = req.body;
    const clientIp = getClientIp(req);

    const captchaValid = await captchaService.verifyCaptcha(
      captcha_token,
      clientIp,
    );

    if (!captchaValid) {
      return next(new ForbiddenError("Captcha không hợp lệ"));
    }

    const contact = await contactService.create(contactData);
    return new CREATED({
      message: "Gửi liên hệ thành công",
      metaData: contact,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const listAdmin = async (req, res) => {
  try {
    const result = await contactService.listAdmin(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleServerError(res);
  }
};

const markRead = async (req, res) => {
  try {
    const contact = await contactService.markRead(Number(req.params.id));
    if (!contact)
      return res.status(404).json({ message: "Không tìm thấy liên hệ" });
    return res.status(200).json(contact);
  } catch (error) {
    return handleServerError(res);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const contact = await contactService.updateStatus(
      Number(req.params.id),
      req.body.status,
    );
    if (!contact) {
      return res.status(404).json({ message: "Không tìm thấy liên hệ" });
    }
    return new SuccessResponse({
      message: "Cập nhật trạng thái thành công",
      metaData: { id: contact.id, status: contact.status },
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = { create, listAdmin, markRead, updateStatus };

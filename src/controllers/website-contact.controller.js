"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const contactService = require("../services/website-contact.service");

const handleServerError = (res) =>
  res.status(500).json({ message: "Lỗi server" });

const create = async (req, res, next) => {
  try {
    const contact = await contactService.create(req.body);
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

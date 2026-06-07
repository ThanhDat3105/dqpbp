"use strict";

const contactService = require("../services/website-contact.service");

const handleServerError = (res) =>
  res.status(500).json({ message: "Lỗi server" });

const create = async (req, res) => {
  try {
    await contactService.create(req.body);
    return res.status(201).json({ success: true, message: "Gửi thành công" });
  } catch (error) {
    return handleServerError(res);
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
    if (!contact) return res.status(404).json({ message: "Không tìm thấy liên hệ" });
    return res.status(200).json(contact);
  } catch (error) {
    return handleServerError(res);
  }
};

module.exports = { create, listAdmin, markRead };

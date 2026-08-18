"use strict";

const slideService = require("../services/website-slide.service");

const getUserId = (req) => req.user?.id || req.user?.user_id;
const canDelete = (req) => ["CHI_HUY", "ADMIN"].includes(req.user?.role);

const handleServerError = (res) =>
  res.status(500).json({ message: "Lỗi server" });

const listPublic = async (req, res) => {
  try {
    const slides = await slideService.listPublic(req.query);
    return res.status(200).json(slides);
  } catch (error) {
    return handleServerError(res);
  }
};

const listAdmin = async (req, res) => {
  try {
    const result = await slideService.listAdmin(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleServerError(res);
  }
};

const create = async (req, res) => {
  try {
    const slide = await slideService.create(req.body, getUserId(req));
    return res.status(201).json(slide);
  } catch (error) {
    return handleServerError(res);
  }
};

const update = async (req, res) => {
  try {
    const slide = await slideService.update(Number(req.params.id), req.body);
    if (!slide) return res.status(404).json({ message: "Không tìm thấy slide" });
    return res.status(200).json(slide);
  } catch (error) {
    return handleServerError(res);
  }
};

const remove = async (req, res) => {
  try {
    if (!canDelete(req)) {
      return res.status(403).json({ message: "Không có quyền xóa" });
    }

    const slide = await slideService.remove(Number(req.params.id));
    if (!slide) return res.status(404).json({ message: "Không tìm thấy slide" });
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleServerError(res);
  }
};

module.exports = { listPublic, listAdmin, create, update, remove };

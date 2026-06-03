"use strict";

const articleService = require("../services/website-article.service");

const getUserId = (req) => req.user?.id || req.user?.user_id;
const canDelete = (req) => ["CHI_HUY", "ADMIN"].includes(req.user?.role);

const handleServerError = (res) =>
  res.status(500).json({ message: "Lỗi server" });

const listPublic = async (req, res) => {
  try {
    const result = await articleService.listPublic(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleServerError(res);
  }
};

const getPublicById = async (req, res) => {
  try {
    const article = await articleService.getPublicById(Number(req.params.id));
    if (!article) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    return res.status(200).json(article);
  } catch (error) {
    return handleServerError(res);
  }
};

const listAdmin = async (req, res) => {
  try {
    const result = await articleService.listAdmin(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleServerError(res);
  }
};

const create = async (req, res) => {
  try {
    const article = await articleService.create(req.body, getUserId(req));
    return res.status(201).json(article);
  } catch (error) {
    return handleServerError(res);
  }
};

const update = async (req, res) => {
  try {
    const article = await articleService.update(Number(req.params.id), req.body);
    if (!article) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    return res.status(200).json(article);
  } catch (error) {
    return handleServerError(res);
  }
};

const remove = async (req, res) => {
  try {
    if (!canDelete(req)) {
      return res.status(403).json({ message: "Không có quyền xóa" });
    }

    const article = await articleService.remove(Number(req.params.id));
    if (!article) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleServerError(res);
  }
};

const toggleVisible = async (req, res) => {
  try {
    const article = await articleService.toggleVisible(Number(req.params.id));
    if (!article) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    return res.status(200).json(article);
  } catch (error) {
    return handleServerError(res);
  }
};

module.exports = {
  listPublic,
  getPublicById,
  listAdmin,
  create,
  update,
  remove,
  toggleVisible,
};

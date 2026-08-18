"use strict";

const documentService = require("../services/website-document.service");

const getUserId = (req) => req.user?.id || req.user?.user_id;
const canDelete = (req) => ["CHI_HUY", "ADMIN"].includes(req.user?.role);

const handleError = (error, res) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }

  return res.status(500).json({ message: "Loi server" });
};

const listPublic = async (req, res) => {
  try {
    const result = await documentService.listPublic(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res);
  }
};

const listAdmin = async (req, res) => {
  try {
    const result = await documentService.listAdmin(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(error, res);
  }
};

const create = async (req, res) => {
  try {
    const document = await documentService.create(
      req.body,
      getUserId(req),
      req.file,
    );
    return res.status(201).json(document);
  } catch (error) {
    return handleError(error, res);
  }
};

const update = async (req, res) => {
  try {
    const document = await documentService.update(
      Number(req.params.id),
      req.body,
      req.file,
    );
    if (!document) {
      return res.status(404).json({ message: "Khong tim thay van ban" });
    }
    return res.status(200).json(document);
  } catch (error) {
    return handleError(error, res);
  }
};

const remove = async (req, res) => {
  try {
    if (!canDelete(req)) {
      return res.status(403).json({ message: "Khong co quyen xoa" });
    }

    const document = await documentService.remove(Number(req.params.id));
    if (!document) {
      return res.status(404).json({ message: "Khong tim thay van ban" });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleError(error, res);
  }
};

module.exports = { listPublic, listAdmin, create, update, remove };

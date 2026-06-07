"use strict";

const { SuccessResponse, CREATED } = require("../core/success.response");
const youthService = require("../services/youth.service");
const { cleanupFile } = require("../middlewares/cleanupFile.middleware");

// ─── GET /api/youth/list ──────────────────────────────────────────────────────
const getList = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, is_registered } = req.query;

    const filters = {
      search: search ?? null,
      is_registered: is_registered !== undefined ? is_registered : undefined,
      page: Number(page),
      limit: Number(limit),
    };

    const data = await youthService.fetchList(filters);

    return new SuccessResponse({
      message: "Get youth personnel list successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/youth/:id ───────────────────────────────────────────────────────
const getById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await youthService.fetchById(id);

    return new SuccessResponse({
      message: "Get youth personnel detail successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── POST /api/youth ──────────────────────────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const data = await youthService.createYouth(req.body);

    return new CREATED({
      message: "Youth personnel created successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// POST /api/youth/import-excel
const importExcel = async (req, res, next) => {
  try {
    const data = await youthService.importYouthFromExcel(req.file?.path);

    return new CREATED({
      message: "Import youth personnel from Excel successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  } finally {
    if (req.file?.path) cleanupFile(req.file.path);
  }
};

// ─── PUT /api/youth/:id ───────────────────────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await youthService.updateYouth(id, req.body);

    return new SuccessResponse({
      message: "Youth personnel updated successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── DELETE /api/youth/:id ────────────────────────────────────────────────────
const remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await youthService.deleteYouth(id);

    return new SuccessResponse({
      message: "Youth personnel deleted successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── POST /api/youth/:id/to-nguon ────────────────────────────────────────────
const promoteToNguon = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await youthService.promoteToNguon(id);

    return new SuccessResponse({
      message: "Chuyen thanh nguon thanh cong",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getList,
  getById,
  create,
  importExcel,
  update,
  remove,
  promoteToNguon,
};

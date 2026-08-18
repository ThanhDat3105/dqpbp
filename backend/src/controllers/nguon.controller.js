"use strict";

const { SuccessResponse, CREATED } = require("../core/success.response");
const nguonService = require("../services/nguon.service");
const { cleanupFile } = require("../middlewares/cleanupFile.middleware");

const getList = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const data = await nguonService.fetchList({
      search: search ?? null,
      page: Number(page),
      limit: Number(limit),
    });
    return new SuccessResponse({
      message: "Get nguon list successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await nguonService.fetchById(Number(req.params.id));
    return new SuccessResponse({
      message: "Get nguon detail successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await nguonService.createNguon(req.body);
    return new CREATED({
      message: "Nguon created successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const importExcel = async (req, res, next) => {
  try {
    const data = await nguonService.importNguonFromExcel(req.file?.path);
    return new CREATED({
      message: "Import nguon from Excel successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  } finally {
    if (req.file?.path) cleanupFile(req.file.path);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await nguonService.updateNguon(Number(req.params.id), req.body);
    return new SuccessResponse({
      message: "Nguon updated successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const data = await nguonService.deleteNguon(Number(req.params.id));
    return new SuccessResponse({
      message: "Nguon deleted successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getList, getById, create, importExcel, update, remove };

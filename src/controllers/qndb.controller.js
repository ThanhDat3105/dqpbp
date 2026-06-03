"use strict";

const { SuccessResponse, CREATED } = require("../core/success.response");
const qndbService = require("../services/qndb.service");
const { cleanupFile } = require("../middlewares/cleanupFile.middleware");

const getList = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const data = await qndbService.fetchList({
      search: search ?? null,
      page: Number(page),
      limit: Number(limit),
    });
    return new SuccessResponse({
      message: "Get quan nhan du bi list successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await qndbService.fetchById(Number(req.params.id));
    return new SuccessResponse({
      message: "Get quan nhan du bi detail successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await qndbService.createQndb(req.body);
    return new CREATED({
      message: "Quan nhan du bi created successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const importExcel = async (req, res, next) => {
  try {
    const data = await qndbService.importQndbFromExcel(req.file?.path);
    return new CREATED({
      message: "Import quan nhan du bi from Excel successfully",
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
    const data = await qndbService.updateQndb(Number(req.params.id), req.body);
    return new SuccessResponse({
      message: "Quan nhan du bi updated successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const data = await qndbService.deleteQndb(Number(req.params.id));
    return new SuccessResponse({
      message: "Quan nhan du bi deleted successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getList, getById, create, importExcel, update, remove };

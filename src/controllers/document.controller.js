"use strict";

const { SuccessResponse, CREATED } = require("../core/success.response");
const documentService = require("../services/document.service");

const getList = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department_id,
      departmentId,
      department_code,
      departmentCode,
      is_public,
      isPublic,
    } = req.query;

    const data = await documentService.fetchList({
      page: Number(page),
      limit: Number(limit),
      search: search ?? null,
      departmentId: department_id ?? departmentId ?? null,
      departmentCode: department_code ?? departmentCode ?? null,
      isPublic: is_public ?? isPublic,
      user: req.user,
    });

    return new SuccessResponse({
      message: "Get documents successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

const upload = async (req, res, next) => {
  try {
    const data = await documentService.uploadDocument({
      file: req.file,
      payload: req.body,
      user: req.user,
    });

    return new CREATED({
      message: "Document uploaded successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getList,
  upload,
};

"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const { ForbiddenError, NotFoundError } = require("../core/error.response");
const articleService = require("../services/website-article.service");

const getUserId = (req) => req.user?.id || req.user?.user_id;
const canDelete = (req) => ["CHI_HUY", "ADMIN"].includes(req.user?.role);

const listPublic = async (req, res, next) => {
  try {
    const result = await articleService.listPublic(req.query);

    return new SuccessResponse({
      message: "Lấy danh sách bài viết công khai thành công",
      metaData: result,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const getPublicById = async (req, res, next) => {
  try {
    const article = await articleService.getPublicById(Number(req.params.id));
    if (!article) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    return new SuccessResponse({
      message: "Lấy chi tiết bài viết thành công",
      metaData: article,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const listAdmin = async (req, res, next) => {
  try {
    const result = await articleService.listAdmin(req.query);

    return new SuccessResponse({
      message: "Lấy danh sách bài viết quản trị thành công",
      metaData: result,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const article = await articleService.create(req.body, getUserId(req));

    return new CREATED({
      message: "Tạo bài viết thành công",
      metaData: article,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const article = await articleService.update(
      Number(req.params.id),
      req.body,
    );

    return new SuccessResponse({
      message: "Cập nhật thành công",
      metaData: article,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    if (!canDelete(req)) {
      throw new ForbiddenError("Không có quyền xóa bài viết");
    }

    const article = await articleService.remove(Number(req.params.id));
    if (!article) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    return new SuccessResponse({
      message: "Xóa bài viết thành công",
      metaData: article,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const toggleVisible = async (req, res, next) => {
  try {
    const article = await articleService.toggleVisible(Number(req.params.id));
    if (!article) {
      throw new NotFoundError("Không tìm thấy bài viết");
    }

    return new SuccessResponse({
      message: "Cập nhật trạng thái hiển thị thành công",
      metaData: article,
    }).send(res);
  } catch (error) {
    return next(error);
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

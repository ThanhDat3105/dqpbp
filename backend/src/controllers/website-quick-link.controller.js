"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const { ForbiddenError, NotFoundError } = require("../core/error.response");
const quickLinkService = require("../services/website-quick-link.service");

const getUserId = (req) => req.user?.id || req.user?.user_id;
const canDelete = (req) => ["CHI_HUY", "ADMIN"].includes(req.user?.role);

const listPublic = async (req, res, next) => {
  try {
    const quickLinks = await quickLinkService.listPublic();

    return new SuccessResponse({
      message: "Lấy danh sách thành công",
      metaData: quickLinks,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const listAdmin = async (req, res, next) => {
  try {
    const result = await quickLinkService.listAdmin(req.query);

    return new SuccessResponse({
      message: "Lấy danh sách quản trị thành công",
      metaData: result,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const quickLink = await quickLinkService.create(req.body, getUserId(req));

    return new CREATED({
      message: "Tạo liên kết nhanh thành công",
      metaData: quickLink,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const quickLink = await quickLinkService.update(
      Number(req.params.id),
      req.body,
    );
    if (!quickLink) {
      throw new NotFoundError("Không tìm thấy liên kết nhanh");
    }

    return new SuccessResponse({
      message: "Cập nhật liên kết nhanh thành công",
      metaData: quickLink,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    if (!canDelete(req)) {
      throw new ForbiddenError("Không có quyền xóa liên kết nhanh");
    }

    const quickLink = await quickLinkService.remove(Number(req.params.id));
    if (!quickLink) {
      throw new NotFoundError("Không tìm thấy liên kết nhanh");
    }

    return new SuccessResponse({
      message: "Xóa liên kết nhanh thành công",
      metaData: quickLink,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

module.exports = { listPublic, listAdmin, create, update, remove };

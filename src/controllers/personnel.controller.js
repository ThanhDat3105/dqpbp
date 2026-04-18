"use strict";

const { SuccessResponse } = require("../core/success.response");
const personnelService = require("../services/personnel.service");

// ─── GET /api/personnel/overview ─────────────────────────────────────────────
const getOverview = async (req, res, next) => {
  try {
    const data = await personnelService.fetchOverview();
    return new SuccessResponse({
      message: "Get personnel overview successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/personnel/by-department ────────────────────────────────────────
const getByDepartment = async (req, res, next) => {
  try {
    const data = await personnelService.fetchByDepartment();
    return new SuccessResponse({
      message: "Get personnel by department successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/personnel/status-breakdown ─────────────────────────────────────
const getStatusBreakdown = async (req, res, next) => {
  try {
    const data = await personnelService.fetchStatusBreakdown();
    return new SuccessResponse({
      message: "Get status breakdown successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/personnel/list ──────────────────────────────────────────────────
const getPersonnelList = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department, status, role } = req.query;

    const filters = {
      department: department ?? null,
      status: status ?? null,
      role: role ?? null,
    };

    const pagination = {
      page: Number(page),
      limit: Number(limit),
    };

    const data = await personnelService.fetchPersonnelList(
      filters,
      pagination,
      req.user,
    );

    return new SuccessResponse({
      message: "Get personnel list successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

// ─── PATCH /api/personnel/:id/status ─────────────────────────────────────────
const updateStatus = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const data = await personnelService.updateUserStatus(id, status, req.user);

    return new SuccessResponse({
      message: "Update status successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getOverview,
  getByDepartment,
  getStatusBreakdown,
  getPersonnelList,
  updateStatus,
};

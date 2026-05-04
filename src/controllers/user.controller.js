"use strict";

const { SuccessResponse } = require("../core/success.response");
const userService = require("../services/user.service");

// ─── Status code helper ───────────────────────────────────────────────────────
const getStatus = (message = "") => {
  const msg = message.toLowerCase();
  if (msg.includes("không tìm thấy") || msg.includes("not found")) return 404;
  if (msg.includes("đã tồn tại") || msg.includes("duplicate")) return 409;
  return 500;
};

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Ví dụ trong UserController.js

const getAll = async (req, res, next) => {
  try {
    // Lấy query từ URL (VD: /api/users?departmentCode=IT01)
    const { role, isActive, search, departmentCode, unitCode } = req.query;

    const departmentCodes = Array.isArray(departmentCode)
      ? departmentCode
      : departmentCode
        ? [departmentCode]
        : [];

    const users = await userService.getAll({
      role,
      isActive,
      search,
      departmentCodes,
      unitCode,
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

const getAvailableUsers = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const users = await userService.getAvailableUsers({
      start_date,
      end_date,
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const data = await userService.getById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    res
      .status(getStatus(err.message))
      .json({ success: false, error: err.message });
  }
};

// ─── POST /api/users ──────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "name, email và password là bắt buộc",
      });
    }

    const data = await userService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res
      .status(getStatus(err.message))
      .json({ success: false, error: err.message });
  }
};

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const data = await userService.update(Number(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) {
    res
      .status(getStatus(err.message))
      .json({ success: false, error: err.message });
  }
};

// ─── PATCH /api/users/:id/toggle-active ──────────────────────────────────────
const toggleActive = async (req, res) => {
  try {
    const data = await userService.toggleActive(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    res
      .status(getStatus(err.message))
      .json({ success: false, error: err.message });
  }
};

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const data = await userService.remove(Number(req.params.id));
    res.json(data);
  } catch (err) {
    res
      .status(getStatus(err.message))
      .json({ success: false, error: err.message });
  }
};

module.exports = {
  getAll,
  getAvailableUsers,
  getById,
  create,
  update,
  toggleActive,
  remove,
};

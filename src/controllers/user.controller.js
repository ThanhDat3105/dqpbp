'use strict';

const { SuccessResponse } = require('../core/success.response');
const userService = require('../services/user.service');

// ─── Status code helper ───────────────────────────────────────────────────────
const getStatus = (message = '') => {
  const msg = message.toLowerCase();
  if (msg.includes('không tìm thấy') || msg.includes('not found')) return 404;
  if (msg.includes('đã tồn tại') || msg.includes('duplicate')) return 409;
  return 500;
};

// ─── GET /api/users ───────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { role, excludeRole, isActive, search } = req.query;

    const params = {
      // role có thể là string hoặc string[] tùy Express parse
      role: role ? (Array.isArray(role) ? role : [role]) : undefined,
      excludeRole,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    };

    if (role) params.role = role;
    if (excludeRole) params.excludeRole = excludeRole;
    if (isActive !== undefined) {
      params.isActive = isActive === 'true';
    }
    if (search) params.search = search;

    const data = await userService.getAll(params);

    return new SuccessResponse({
      message: "Get all user successfully",
      metaData: data,
    }).send(res);
  } catch (err) {
    res.status(getStatus(err.message)).json({ success: false, error: err.message });
  }
};

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const data = await userService.getById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    res.status(getStatus(err.message)).json({ success: false, error: err.message });
  }
};

// ─── POST /api/users ──────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'name, email và password là bắt buộc',
      });
    }

    const data = await userService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getStatus(err.message)).json({ success: false, error: err.message });
  }
};

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const data = await userService.update(Number(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getStatus(err.message)).json({ success: false, error: err.message });
  }
};

// ─── PATCH /api/users/:id/toggle-active ──────────────────────────────────────
const toggleActive = async (req, res) => {
  try {
    const data = await userService.toggleActive(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    res.status(getStatus(err.message)).json({ success: false, error: err.message });
  }
};

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    const data = await userService.remove(Number(req.params.id));
    res.json(data);
  } catch (err) {
    res.status(getStatus(err.message)).json({ success: false, error: err.message });
  }
};

module.exports = { getAll, getById, create, update, toggleActive, remove };

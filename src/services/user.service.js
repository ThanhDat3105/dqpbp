'use strict';

const db = require('../config/db');
const bcrypt = require('bcrypt');

const SAFE_COLUMNS = `
  id, name, department_id, address, lat, lng,
  phone, cccd, email, role,
  is_active, last_login_at, created_at, updated_at,
  unit_code, managed_units
`;

// ─── 1. Get all users ────────────────────────────────────────────────────────
// Supports: role, excludeRole, isActive, search
const getAll = async (params = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (params.role !== undefined) {
    const roles = Array.isArray(params.role) ? params.role : [params.role];
    conditions.push(`LOWER(role) = ANY($${idx++})`);
    values.push(roles.map(r => r.toLowerCase()));
  }

  if (params.excludeRole !== undefined) {
    conditions.push(`role != $${idx++}`);
    values.push(params.excludeRole);
  }

  if (params.isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    values.push(params.isActive);
  }

  if (params.search) {
    conditions.push(`(name ILIKE $${idx} OR phone ILIKE $${idx})`);
    values.push(`%${params.search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT ${SAFE_COLUMNS} FROM users ${where} ORDER BY name ASC`,
    values
  );

  return rows;
};

// ─── 2. Get user by ID ───────────────────────────────────────────────────────
const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error(`Không tìm thấy người dùng với id ${id}`);
    err.status = 404;
    throw err;
  }

  return rows[0];
};

// ─── 3. Create user ──────────────────────────────────────────────────────────
const create = async (data) => {
  const { name, email, password, department, address, lat, lng, phone, cccd, role, unit_code, managed_units } = data;

  // Check duplicate email
  const { rows: existing } = await db.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (existing.length > 0) {
    const err = new Error('Email đã tồn tại');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { rows } = await db.query(
    `INSERT INTO users
       (name, email, password_hash, department_id, address, lat, lng, phone, cccd, role, unit_code, managed_units)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING ${SAFE_COLUMNS}`,
    [
      name,
      email,
      password_hash,
      department ?? null,
      address ?? null,
      lat ?? null,
      lng ?? null,
      phone ?? null,
      cccd ?? null,
      role ?? 'dqtt',
      unit_code ?? null,
      managed_units ?? null,
    ]
  );

  return rows[0];
};

// ─── 4. Update user ──────────────────────────────────────────────────────────
// Only updates provided fields. email and password_hash are NOT updatable here.
const UPDATABLE_FIELDS = [
  'name', 'department_id', 'address', 'lat', 'lng', 'phone',
  'cccd', 'role', 'unit_code', 'managed_units', 'is_active',
];

const update = async (id, data) => {
  // Ensure user exists
  await getById(id);

  if (data.department !== undefined) {
    data.department_id = data.department;
  }

  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const field of UPDATABLE_FIELDS) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = $${idx++}`);
      values.push(data[field]);
    }
  }

  if (setClauses.length === 0) {
    const err = new Error('Không có trường nào được cung cấp để cập nhật');
    err.status = 400;
    throw err;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await db.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING ${SAFE_COLUMNS}`,
    values
  );

  return rows[0];
};

// ─── 5. Toggle is_active ─────────────────────────────────────────────────────
const toggleActive = async (id) => {
  const { rows } = await db.query(
    `UPDATE users
     SET is_active = NOT is_active, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, is_active`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error(`Không tìm thấy người dùng với id ${id}`);
    err.status = 404;
    throw err;
  }

  return rows[0];
};

// ─── 6. Delete user ──────────────────────────────────────────────────────────
const remove = async (id) => {
  const { rows } = await db.query(
    `DELETE FROM users WHERE id = $1 RETURNING id`,
    [id]
  );

  if (rows.length === 0) {
    const err = new Error(`Không tìm thấy người dùng với id ${id}`);
    err.status = 404;
    throw err;
  }

  return { success: true, deleted_id: rows[0].id };
};

module.exports = { getAll, getById, create, update, toggleActive, remove };

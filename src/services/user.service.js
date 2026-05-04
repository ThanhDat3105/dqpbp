"use strict";

const db = require("../config/db");
const bcrypt = require("bcrypt");

const SAFE_COLUMNS = `
  id, name, department_id, address, lat, lng, enlistment_date,
  phone, email, role, unit_code, managed_units, military_rank, date_of_birth,
  is_active, last_login_at, created_at, updated_at,
  unit_code, managed_units
`;

// ─── 1. Get all users ────────────────────────────────────────────────────────
// Supports: role, excludeRole, isActive, search, departmentCode, unitCode
const getAll = async (params = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (params.role !== undefined) {
    const roles = Array.isArray(params.role) ? params.role : [params.role];
    conditions.push(`role = ANY($${idx++})`);
    values.push(roles);
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

  if (params.departmentCodes.length !== 0) {
    // CẬP NHẬT: Xử lý departmentCode dưới dạng mảng (nhiều department)
    if (params.departmentCodes !== undefined) {
      // Ép kiểu về mảng nếu chỉ có 1 giá trị được truyền vào
      const deptCodes = Array.isArray(params.departmentCodes)
        ? params.departmentCodes
        : [params.departmentCodes];

      // Dùng ANY() để tìm các user có department_id thuộc danh sách code được gửi lên
      conditions.push(
        `department_id IN (SELECT id FROM departments WHERE code = ANY($${idx++}))`,
      );
      values.push(deptCodes);
    }
  }

  // CẬP NHẬT: Xử lý unitCode dưới dạng mảng (nhiều unit)
  if (params.unitCode !== undefined) {
    const unitCodes = Array.isArray(params.unitCode)
      ? params.unitCode
      : [params.unitCode];

    conditions.push(`unit_code = ANY($${idx++})`);
    values.push(unitCodes);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  if (!params.includeKpi) {
    const { rows } = await db.query(
      `SELECT ${SAFE_COLUMNS} FROM users ${where} ORDER BY name ASC`,
      values,
    );

    return rows;
  }

  const { rows } = await db.query(
    `
    WITH base_users AS (
      SELECT ${SAFE_COLUMNS} FROM users ${where} ORDER BY name ASC
    ),
    kpi AS (
      SELECT
        ta.user_id,
        COUNT(*) FILTER (WHERE t.status != 'cancelled')    AS total_assigned,
        COUNT(*) FILTER (WHERE t.status = 'completed')     AS completed,
        COUNT(*) FILTER (
          WHERE t.status = 'completed'
          AND t.completed_at IS NOT NULL
          AND t.completed_at <= t.due_date
        )                                                  AS on_time,
        COUNT(*) FILTER (WHERE t.status = 'cancelled')     AS cancelled
      FROM task_assignees ta
      JOIN activity_tasks t ON t.id = ta.task_id
      GROUP BY ta.user_id
    )
    SELECT
      u.*,
      COALESCE(k.total_assigned, 0)  AS kpi_total_assigned,
      COALESCE(k.completed, 0)       AS kpi_completed,
      COALESCE(k.on_time, 0)         AS kpi_on_time,
      COALESCE(k.cancelled, 0)       AS kpi_cancelled,
      ROUND(
        COALESCE(k.completed, 0)::numeric
        / NULLIF(COALESCE(k.total_assigned, 0), 0) * 100, 1
      )                              AS kpi_completion_rate,
      ROUND(
        COALESCE(k.on_time, 0)::numeric
        / NULLIF(COALESCE(k.completed, 0), 0) * 100, 1
      )                              AS kpi_on_time_rate
    FROM base_users u
    LEFT JOIN kpi k ON k.user_id = u.id
    `,
    values,
  );

  return rows;
};

// ─── 2. Get user by ID ───────────────────────────────────────────────────────
const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [id],
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
  const {
    name,
    email,
    password,
    department,
    address,
    lat,
    lng,
    phone,
    cccd,
    role,
    unit_code,
    managed_units,
  } = data;

  // Check duplicate email
  const { rows: existing } = await db.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  if (existing.length > 0) {
    const err = new Error("Email đã tồn tại");
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
      role ?? "dqtt",
      unit_code ?? null,
      managed_units ?? null,
    ],
  );

  return rows[0];
};

// ─── 4. Update user ──────────────────────────────────────────────────────────
// Only updates provided fields. email and password_hash are NOT updatable here.
const UPDATABLE_FIELDS = [
  "name",
  "department_id",
  "address",
  "lat",
  "lng",
  "phone",
  "cccd",
  "role",
  "unit_code",
  "managed_units",
  "is_active",
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
    const err = new Error("Không có trường nào được cung cấp để cập nhật");
    err.status = 400;
    throw err;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await db.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING ${SAFE_COLUMNS}`,
    values,
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
    [id],
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
    [id],
  );

  if (rows.length === 0) {
    const err = new Error(`Không tìm thấy người dùng với id ${id}`);
    err.status = 404;
    throw err;
  }

  return { success: true, deleted_id: rows[0].id };
};

// ─── 7. Get Available Users ──────────────────────────────────────────────────
const getAvailableUsers = async ({ start_date, end_date }) => {
  const startObj = new Date(start_date);
  const endObj = new Date(end_date);

  if (isNaN(startObj) || isNaN(endObj)) {
    throw new Error("Invalid date");
  }

  if (endObj <= startObj) {
    throw new Error("end_date phải sau start_date");
  }

  const inputDate = startObj.toISOString().split("T")[0];
  const inputStartTime = startObj.toTimeString().slice(0, 8);
  const inputEndTime = endObj.toTimeString().slice(0, 8);

  const jsDow = startObj.getDay();
  const dbDow = jsDow === 0 ? 7 : jsDow;

  const weekStart = new Date(startObj);
  weekStart.setDate(startObj.getDate() - (jsDow === 0 ? 6 : jsDow - 1));
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const query = `
    SELECT 
      u.id, 
      u.name, 
      u.unit_code,
      COALESCE(ms.mobilize_count, 0) AS mobilize_count
    FROM users u
    LEFT JOIN dqcd_mobilize_summary ms
      ON ms.user_id = u.id
      AND ms.week_start = $1::date
    WHERE u.role = 'DQCD'
      AND u.is_active = true

      -- ĐIỀU KIỆN 1: User có đăng ký lịch rảnh trong khung giờ này
      AND EXISTS (
        SELECT 1
        FROM user_schedule_templates ust
        WHERE ust.user_id = u.id
          AND ust.week_start = $1::date
          AND ust.day_of_week = $2
          AND ust.start_time <= $3::time
          AND ust.end_time   >= $4::time
      )

      -- ĐIỀU KIỆN 2: User chưa được assign task nào trùng khung giờ
      AND NOT EXISTS (
        SELECT 1
        FROM task_assignees ta
        JOIN activity_tasks at2 ON at2.id = ta.task_id
        WHERE ta.user_id = u.id
          AND at2.status NOT IN ('cancelled', 'completed')
          AND at2.start_date < $6::timestamp
          AND at2.due_date   > $5::timestamp
      )

    ORDER BY COALESCE(ms.mobilize_count, 0) ASC, u.name ASC
  `;

  const { rows } = await db.query(query, [
    weekStartStr,
    dbDow,
    inputStartTime,
    inputEndTime,
    start_date,
    end_date,
  ]);

  return rows;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  toggleActive,
  remove,
  getAvailableUsers,
};

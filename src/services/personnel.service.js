"use strict";

const db = require("../config/db");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../core/error.response");

// ─── 1. Overview stats ───────────────────────────────────────────────────────
const fetchOverview = async () => {
  const { rows } = await db.query(`
    SELECT
      COUNT(*)                                                              AS total_users,
      COUNT(*) FILTER (WHERE u.role = 'CHI_HUY')                          AS total_chi_huy,
      COUNT(*) FILTER (WHERE u.role = 'TO_TRUONG')                        AS total_to_truong,
      COUNT(*) FILTER (WHERE u.role = 'DQTT')                             AS total_dqtt,
      COUNT(*) FILTER (WHERE u.role = 'DQCD')                             AS total_dqcd,
      COUNT(DISTINCT u.department_id)                                       AS total_departments,
      ROUND(
        COUNT(*) FILTER (WHERE u.status = 'on_duty') * 100.0 / NULLIF(COUNT(*), 0)
      , 0)                                                                  AS readiness_percent
    FROM users u
    WHERE u.is_active = true
  `);

  const row = rows[0];

  return {
    total_users: Number(row.total_users),
    total_chi_huy: Number(row.total_chi_huy),
    total_to_truong: Number(row.total_to_truong),
    total_dqtt: Number(row.total_dqtt),
    total_dqcd: Number(row.total_dqcd),
    total_departments: Number(row.total_departments),
    alerts: 3, // hardcoded per spec
    readiness_percent: Number(row.readiness_percent ?? 0),
  };
};

// ─── 2. Personnel by department (LEFT JOIN — returns all 5 departments) ───────
const fetchByDepartment = async () => {
  const { rows } = await db.query(`
    SELECT
      d.id   AS department_id,
      d.code AS department_code,
      d.name AS department_name,
      COUNT(u.id) AS total
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.is_active = true
    GROUP BY d.id, d.code, d.name
    ORDER BY d.id
  `);

  return {
    data: rows.map((r) => ({
      department_id: Number(r.department_id),
      department_code: r.department_code,
      department_name: r.department_name,
      total: Number(r.total),
    })),
  };
};

// ─── 3. Status breakdown ─────────────────────────────────────────────────────
const fetchStatusBreakdown = async () => {
  const { rows } = await db.query(`
    SELECT
      status,
      COUNT(*) AS count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 0) AS percent
    FROM users
    WHERE is_active = true
    GROUP BY status
  `);

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return {
    total,
    breakdown: rows.map((r) => ({
      status: r.status,
      count: Number(r.count),
      percent: Number(r.percent),
    })),
  };
};

// ─── Helper: resolve department_code → department_id ─────────────────────────
const getDepartmentIdByCode = async (code) => {
  const { rows } = await db.query(
    `SELECT id FROM departments WHERE code = $1 LIMIT 1`,
    [code],
  );
  if (rows.length === 0) {
    throw new BadRequestError(`department_code không hợp lệ: "${code}"`);
  }
  return rows[0].id;
};

// ─── 4. Personnel list with filters + pagination ─────────────────────────────
// Business Rule #2: TO_TRUONG only sees their own department
const fetchPersonnelList = async (filters, pagination, requester) => {
  const { department_code, status, role } = filters;
  const { page, limit } = pagination;

  const offset = (page - 1) * limit;

  // Resolve department_code → department_id
  // TO_TRUONG always scoped to their own department_id (ignores query param)
  let effectiveDeptId = null;

  if (requester.role === "TO_TRUONG") {
    effectiveDeptId = requester.department_id ?? null;
  } else if (department_code) {
    effectiveDeptId = await getDepartmentIdByCode(department_code);
  }

  const params = [effectiveDeptId, status ?? null, role ?? null, limit, offset];

  const { rows } = await db.query(
    `SELECT
       u.id, u.name, u.role, u.status, u.shift_start_at,
       d.id   AS department_id,
       d.code AS department_code,
       d.name AS department_name
     FROM users u
     JOIN departments d ON d.id = u.department_id
     WHERE u.is_active = true
       AND ($1::integer IS NULL OR u.department_id = $1)
       AND ($2::text    IS NULL OR u.status        = $2)
       AND ($3::text    IS NULL OR u.role           = $3)
     ORDER BY
       CASE u.status WHEN 'on_duty' THEN 0 WHEN 'training' THEN 1 ELSE 2 END,
       u.shift_start_at ASC NULLS LAST
     LIMIT $4 OFFSET $5`,
    params,
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM users u
     WHERE u.is_active = true
       AND ($1::integer IS NULL OR u.department_id = $1)
       AND ($2::text    IS NULL OR u.status        = $2)
       AND ($3::text    IS NULL OR u.role           = $3)`,
    [effectiveDeptId, status ?? null, role ?? null],
  );

  return {
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      status: r.status,
      shift_start_at: r.shift_start_at,
      department_id: Number(r.department_id),
      department_code: r.department_code,
      department_name: r.department_name,
    })),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total),
    },
  };
};

// ─── 5. Update user status ───────────────────────────────────────────────────
// Business Rules #3, #4: shift_start_at auto-managed
// Business Rule #2: TO_TRUONG can only update users in their own department
const updateUserStatus = async (id, status, requester) => {
  // Fetch target user's department_id
  const { rows: userRows } = await db.query(
    `SELECT id, name, department_id FROM users WHERE id = $1 AND is_active = true LIMIT 1`,
    [id],
  );

  if (userRows.length === 0) {
    throw new NotFoundError("Không tìm thấy người dùng hoặc tài khoản đã bị vô hiệu hóa");
  }

  const targetUser = userRows[0];

  // Business Rule #2: compare department_id (integer FK) not string
  if (
    requester.role === "TO_TRUONG" &&
    targetUser.department_id !== requester.department_id
  ) {
    throw new ForbiddenError("Bạn chỉ có thể cập nhật trạng thái thành viên trong tổ của mình");
  }

  // Business Rules #3 & #4: shift_start_at auto-set based on new status
  const { rows } = await db.query(
    `UPDATE users
     SET
       status         = $1,
       shift_start_at = CASE WHEN $1 = 'on_duty' THEN NOW() ELSE NULL END,
       updated_at     = NOW()
     WHERE id = $2 AND is_active = true
     RETURNING id, name, status, shift_start_at, updated_at`,
    [status, id],
  );

  return rows[0];
};

module.exports = {
  fetchOverview,
  fetchByDepartment,
  fetchStatusBreakdown,
  fetchPersonnelList,
  updateUserStatus,
};

"use strict";

const bcrypt = require("bcrypt");
const db = require("../config/db");
const getPrismaClient = require("../config/prisma");

const notFoundError = (id) => {
  const err = new Error(`Không tìm thấy người dùng với id ${id}`);
  err.status = 404;
  return err;
};

const toUserRow = (user) => ({
  id: user.id,
  name: user.name,
  department_id: user.departmentId,
  address: user.address,
  neighborhood: user.neighborhood,
  lat: user.lat,
  lng: user.lng,
  enlistment_date: user.enlistmentDate,
  phone: user.phone,
  email: user.email,
  role: user.role,
  unit_code: user.unitCode,
  managed_units: user.managedUnits,
  military_rank: user.militaryRank,
  date_of_birth: user.dateOfBirth,
  is_active: user.isActive,
  last_login_at: user.lastLoginAt,
  created_at: user.createdAt,
  updated_at: user.updatedAt,
});

const SAFE_COLUMNS = `
  id, name, department_id, address, neighborhood, lat, lng, enlistment_date,
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

  if (params.departmentCodes && params.departmentCodes.length > 0) {
    const deptCodes = Array.isArray(params.departmentCodes)
      ? params.departmentCodes
      : [params.departmentCodes];

    conditions.push(
      `department_id IN (SELECT id FROM departments WHERE code = ANY($${idx++}))`,
    );
    values.push(deptCodes);
  }

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
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id },
    omit: { passwordHash: true },
  });

  if (!user) {
    throw notFoundError(id);
  }

  return toUserRow(user);
};

// ─── 3. Create user ──────────────────────────────────────────────────────────
const create = async (data) => {
  const {
    name,
    email,
    password,
    department,
    address,
    neighborhood,
    lat,
    lng,
    phone,
    cccd,
    role,
    unit_code,
    managed_units,
  } = data;

  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    const err = new Error("Email đã tồn tại");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        departmentId: department ?? null,
        address: address ?? null,
        neighborhood: neighborhood ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
        phone: phone ?? null,
        cccd: cccd ?? null,
        role: role ?? "dqtt",
        unitCode: unit_code ?? null,
        managedUnits: managed_units ?? [],
      },
      omit: { passwordHash: true },
    });

    return newUser;
  });

  return toUserRow(user);
};

// ─── 4. Update user ──────────────────────────────────────────────────────────
// Only updates provided fields. email and password_hash are NOT updatable here.
const UPDATABLE_FIELD_MAP = {
  name: "name",
  department_id: "departmentId",
  address: "address",
  neighborhood: "neighborhood",
  lat: "lat",
  lng: "lng",
  phone: "phone",
  cccd: "cccd",
  role: "role",
  unit_code: "unitCode",
  managed_units: "managedUnits",
  is_active: "isActive",
};

const update = async (id, data) => {
  if (data.department !== undefined) {
    data.department_id = data.department;
  }

  const prismaData = {};
  for (const [inputField, prismaField] of Object.entries(UPDATABLE_FIELD_MAP)) {
    if (data[inputField] !== undefined) {
      prismaData[prismaField] = data[inputField];
    }
  }

  if (Object.keys(prismaData).length === 0) {
    const err = new Error("Không có trường nào được cung cấp để cập nhật");
    err.status = 400;
    throw err;
  }

  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw notFoundError(id);
  }

  const user = await prisma.user.update({
    where: { id },
    data: prismaData,
    omit: { passwordHash: true },
  });

  return toUserRow(user);
};

// ─── 5. Toggle is_active ─────────────────────────────────────────────────────
const toggleActive = async (id) => {
  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, isActive: true },
  });

  if (!existing) {
    throw notFoundError(id);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: { id: true, name: true, isActive: true },
  });

  return { id: user.id, name: user.name, is_active: user.isActive };
};

// ─── 6. Delete user ──────────────────────────────────────────────────────────
const remove = async (id) => {
  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw notFoundError(id);
  }

  const deleted = await prisma.user.delete({
    where: { id },
    select: { id: true },
  });

  return { success: true, deleted_id: deleted.id };
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

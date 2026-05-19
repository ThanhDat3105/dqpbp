"use strict";

const db = require("../config/db");
const { NotFoundError } = require("../core/error.response");

// ─── 1. List với filter + pagination ─────────────────────────────────────────
const fetchList = async (filters) => {
  const { search, page, limit } = filters;
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    `SELECT
       id, full_name, date_of_birth,
       permanent_address, phone, education_level,
       military_rank, unit, service_start_date,
       service_end_date, reserve_class, note
     FROM quan_nhan_du_bi
     WHERE ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')
     ORDER BY id ASC
     LIMIT $2 OFFSET $3`,
    [search ?? null, limit, offset],
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM quan_nhan_du_bi
     WHERE ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')`,
    [search ?? null],
  );

  return {
    data: rows,
    page,
    limit,
    total: Number(countRows[0].total),
  };
};

// ─── 2. Detail by ID ─────────────────────────────────────────────────────────
const fetchById = async (id) => {
  const { rows } = await db.query(
    `SELECT * FROM quan_nhan_du_bi WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ quân nhân dự bị với id = ${id}`);
  }
  return rows[0];
};

// ─── 3. Create ───────────────────────────────────────────────────────────────
const createQndb = async (payload) => {
  const {
    full_name,
    date_of_birth,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    military_rank = null,
    unit = null,
    service_start_date = null,
    service_end_date = null,
    reserve_class = null,
    note = null,
  } = payload;

  const { rows } = await db.query(
    `INSERT INTO quan_nhan_du_bi
       (full_name, date_of_birth, permanent_address, temporary_address,
        phone, education_level, military_rank, unit,
        service_start_date, service_end_date, reserve_class, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      full_name,
      date_of_birth,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      military_rank,
      unit,
      service_start_date,
      service_end_date,
      reserve_class,
      note,
    ],
  );
  return rows[0];
};

// ─── 4. Update (COALESCE — chỉ update fields được gửi) ───────────────────────
const updateQndb = async (id, payload) => {
  await fetchById(id);

  const {
    full_name = null,
    date_of_birth = null,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    military_rank = null,
    unit = null,
    service_start_date = null,
    service_end_date = null,
    reserve_class = null,
    note = null,
  } = payload;

  const { rows } = await db.query(
    `UPDATE quan_nhan_du_bi
     SET
       full_name          = COALESCE($1,  full_name),
       date_of_birth      = COALESCE($2,  date_of_birth),
       permanent_address  = COALESCE($3,  permanent_address),
       temporary_address  = COALESCE($4,  temporary_address),
       phone              = COALESCE($5,  phone),
       education_level    = COALESCE($6,  education_level),
       military_rank      = COALESCE($7,  military_rank),
       unit               = COALESCE($8,  unit),
       service_start_date = COALESCE($9,  service_start_date),
       service_end_date   = COALESCE($10, service_end_date),
       reserve_class      = COALESCE($11, reserve_class),
       note               = COALESCE($12, note),
       updated_at         = NOW()
     WHERE id = $13
     RETURNING *`,
    [
      full_name,
      date_of_birth,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      military_rank,
      unit,
      service_start_date,
      service_end_date,
      reserve_class,
      note,
      id,
    ],
  );
  return rows[0];
};

// ─── 5. Delete ───────────────────────────────────────────────────────────────
const deleteQndb = async (id) => {
  const { rows } = await db.query(
    `DELETE FROM quan_nhan_du_bi WHERE id = $1 RETURNING id`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ quân nhân dự bị với id = ${id}`);
  }
  return { deleted_id: rows[0].id };
};

module.exports = { fetchList, fetchById, createQndb, updateQndb, deleteQndb };

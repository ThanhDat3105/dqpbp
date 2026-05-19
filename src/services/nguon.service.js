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
       youth_personnel_id, note
     FROM nguon
     WHERE ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')
     ORDER BY id ASC
     LIMIT $2 OFFSET $3`,
    [search ?? null, limit, offset],
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM nguon
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
  const { rows } = await db.query(`SELECT * FROM nguon WHERE id = $1`, [id]);
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ nguồn với id = ${id}`);
  }
  return rows[0];
};

// ─── 3. Create ───────────────────────────────────────────────────────────────
const createNguon = async (payload) => {
  const {
    full_name,
    date_of_birth,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    youth_personnel_id = null,
    note = null,
  } = payload;

  const { rows } = await db.query(
    `INSERT INTO nguon
       (full_name, date_of_birth, permanent_address, temporary_address,
        phone, education_level, youth_personnel_id, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      full_name,
      date_of_birth,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      youth_personnel_id,
      note,
    ],
  );
  return rows[0];
};

// ─── 4. Update (COALESCE — chỉ update fields được gửi) ───────────────────────
const updateNguon = async (id, payload) => {
  await fetchById(id);

  const {
    full_name = null,
    date_of_birth = null,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    note = null,
  } = payload;

  const { rows } = await db.query(
    `UPDATE nguon
     SET
       full_name         = COALESCE($1, full_name),
       date_of_birth     = COALESCE($2, date_of_birth),
       permanent_address = COALESCE($3, permanent_address),
       temporary_address = COALESCE($4, temporary_address),
       phone             = COALESCE($5, phone),
       education_level   = COALESCE($6, education_level),
       note              = COALESCE($7, note),
       updated_at        = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      full_name,
      date_of_birth,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      note,
      id,
    ],
  );
  return rows[0];
};

// ─── 5. Delete ───────────────────────────────────────────────────────────────
const deleteNguon = async (id) => {
  const { rows } = await db.query(
    `DELETE FROM nguon WHERE id = $1 RETURNING id`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ nguồn với id = ${id}`);
  }
  return { deleted_id: rows[0].id };
};

module.exports = { fetchList, fetchById, createNguon, updateNguon, deleteNguon };

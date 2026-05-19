"use strict";

const db = require("../config/db");
const {
  NotFoundError,
  ConflictRequestError,
} = require("../core/error.response");

// ─── 1. List với filter + pagination ─────────────────────────────────────────
const fetchList = async (filters) => {
  const { search, is_registered, page, limit } = filters;
  const offset = (page - 1) * limit;

  const params = [
    search ?? null,
    is_registered !== undefined ? is_registered : null,
    limit,
    offset,
  ];

  const { rows } = await db.query(
    `SELECT
       id, full_name, date_of_birth,
       permanent_address, phone, education_level, is_registered
     FROM youth_personnel
     WHERE
       ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')
       AND ($2::boolean IS NULL OR is_registered = $2)
     ORDER BY id ASC
     LIMIT $3 OFFSET $4`,
    params,
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM youth_personnel
     WHERE
       ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')
       AND ($2::boolean IS NULL OR is_registered = $2)`,
    [search ?? null, is_registered !== undefined ? is_registered : null],
  );

  return {
    data: rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      date_of_birth: r.date_of_birth,
      permanent_address: r.permanent_address,
      phone: r.phone,
      education_level: r.education_level,
      is_registered: r.is_registered,
    })),
    page,
    limit,
    total: Number(countRows[0].total),
  };
};

// ─── 2. Detail by ID ─────────────────────────────────────────────────────────
const fetchById = async (id) => {
  const { rows } = await db.query(
    `SELECT * FROM youth_personnel WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ tuổi 17 với id = ${id}`);
  }
  return rows[0];
};

// ─── 3. Create ───────────────────────────────────────────────────────────────
const createYouth = async (payload) => {
  const {
    full_name,
    date_of_birth,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    is_registered = false,
  } = payload;
  const { rows } = await db.query(
    `INSERT INTO youth_personnel
         (full_name, date_of_birth, permanent_address, temporary_address, phone, education_level, is_registered)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
    [
      full_name,
      date_of_birth,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      is_registered,
    ],
  );
  return rows[0];
};

// ─── 4. Update (COALESCE — chỉ update fields được gửi) ───────────────────────
const updateYouth = async (id, payload) => {
  // Đảm bảo bản ghi tồn tại trước
  await fetchById(id);

  const {
    full_name = null,
    date_of_birth = null,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    is_registered = null,
  } = payload;

  const { rows } = await db.query(
    `UPDATE youth_personnel
     SET
       full_name         = COALESCE($1, full_name),
       date_of_birth     = COALESCE($2, date_of_birth),
       permanent_address = COALESCE($3, permanent_address),
       temporary_address = COALESCE($4, temporary_address),
       phone             = COALESCE($5, phone),
       education_level   = COALESCE($6, education_level),
       is_registered     = COALESCE($7, is_registered),
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
      is_registered,
      id,
    ],
  );

  return rows[0];
};

// ─── 5. Chuyển hồ sơ tuổi 17 thành Nguồn ────────────────────────────────────
const promoteToNguon = async (id) => {
  const youth = await fetchById(id);

  const { rows } = await db.query(
    `INSERT INTO nguon
       (full_name, date_of_birth, permanent_address, temporary_address,
        phone, education_level, youth_personnel_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      youth.full_name,
      youth.date_of_birth,
      youth.permanent_address,
      youth.temporary_address,
      youth.phone,
      youth.education_level,
      youth.id,
    ],
  );

  // Xóa khỏi danh sách tuổi 17 sau khi chuyển sang Nguồn
  await db.query(`DELETE FROM youth_personnel WHERE id = $1`, [id]);

  return rows[0];
};

// ─── 6. Delete ───────────────────────────────────────────────────────────────
const deleteYouth = async (id) => {
  const { rows } = await db.query(
    `DELETE FROM youth_personnel WHERE id = $1 RETURNING id`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ tuổi 17 với id = ${id}`);
  }
  return { deleted_id: rows[0].id };
};

module.exports = {
  fetchList,
  fetchById,
  createYouth,
  updateYouth,
  deleteYouth,
  promoteToNguon,
};

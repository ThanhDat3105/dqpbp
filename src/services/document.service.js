"use strict";

const db = require("../config/db");
const { uploadToR2 } = require("./r2.service");
const { BadRequestError } = require("../core/error.response");

const PRIVILEGED_ROLES = ["CHI_HUY", "TO_TRUONG", "ADMIN"];

const normalizeBooleanFilter = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  return null;
};

const fetchList = async ({
  page,
  limit,
  search,
  departmentId,
  departmentCode,
  isPublic,
  user,
}) => {
  const safePage = Number(page) || 1;
  const safeLimit = Number(limit) || 10;
  const offset = (safePage - 1) * safeLimit;
  const isPrivileged = PRIVILEGED_ROLES.includes(user.role);
  const isPublicFilter = normalizeBooleanFilter(isPublic);

  const params = [
    search || null,
    departmentId || null,
    departmentCode || null,
    isPublicFilter,
    user.department_id || null,
    isPrivileged,
    safeLimit,
    offset,
  ];

  const whereClause = `
    WHERE
      ($1::text IS NULL OR d.title ILIKE '%' || $1 || '%' OR d.description ILIKE '%' || $1 || '%' OR d.file_name ILIKE '%' || $1 || '%')
      AND ($2::int IS NULL OR d.department_id = $2)
      AND ($3::text IS NULL OR dep.code = $3)
      AND ($4::boolean IS NULL OR d.is_public = $4)
      AND (
        d.is_public = true
        OR $6::boolean = true
        OR d.department_id = $5
      )
  `;

  const { rows } = await db.query(
    `SELECT
       d.id,
       d.title,
       d.description,
       d.file_url,
       d.file_name,
       d.is_public,
       d.uploaded_by,
       d.department_id,
       dep.code AS department_code,
       dep.name AS department_name,
       d.created_at,
       d.updated_at
     FROM documents d
     LEFT JOIN departments dep ON dep.id = d.department_id
     ${whereClause}
     ORDER BY d.created_at DESC, d.id DESC
     LIMIT $7 OFFSET $8`,
    params,
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM documents d
     LEFT JOIN departments dep ON dep.id = d.department_id
     ${whereClause}`,
    params.slice(0, 6),
  );

  return {
    data: rows,
    page: safePage,
    limit: safeLimit,
    total: Number(countRows[0].total),
  };
};

const uploadDocument = async ({ file, payload, user }) => {
  if (!file) {
    throw new BadRequestError("No file provided");
  }

  const title = String(payload.title || file.originalname || "").trim();
  const description = payload.description ? String(payload.description).trim() : null;
  const departmentId = Number(
    payload.department_id || payload.departmentId || user.department_id,
  );
  const isPublic =
    normalizeBooleanFilter(payload.is_public ?? payload.isPublic) ?? false;

  if (!title) {
    throw new BadRequestError("title is required");
  }

  if (!departmentId) {
    throw new BadRequestError("department_id is required");
  }

  const fileUrl = await uploadToR2(
    file.buffer,
    file.originalname,
    file.mimetype,
    "documents",
  );

  const { rows } = await db.query(
    `INSERT INTO documents
       (title, description, file_url, file_name, is_public, uploaded_by, department_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      title,
      description,
      fileUrl,
      file.originalname,
      isPublic,
      user.user_id,
      departmentId,
    ],
  );

  return rows[0];
};

module.exports = {
  fetchList,
  uploadDocument,
};

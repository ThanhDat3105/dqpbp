"use strict";

const db = require("../config/db");

const toPage = (value) => Number(value) || 1;
const toLimit = (value) => Number(value) || 10;
const normalizeTotal = (rows) =>
  rows.length > 0 ? Number(rows[0].total_count) : 0;

const buildListResponse = (rows, page, limit) => ({
  data: rows.map(({ total_count, ...row }) => row),
  total: normalizeTotal(rows),
  page,
  limit,
});

const listPublic = async (filters) => {
  const page = toPage(filters.page);
  const limit = toLimit(filters.limit);
  const offset = (page - 1) * limit;
  const params = [];
  const where = ["is_visible = true"];

  if (filters.category) {
    params.push(filters.category);
    where.push(`category = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }

  if (filters.year) {
    params.push(filters.year);
    where.push(`EXTRACT(YEAR FROM issued_date) = $${params.length}`);
  }

  if (filters.keyword) {
    params.push(`%${filters.keyword}%`);
    where.push(`(title ILIKE $${params.length} OR doc_number ILIKE $${params.length})`);
  }

  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM website_documents
     WHERE ${where.join(" AND ")}
     ORDER BY display_order ASC, issued_date DESC NULLS LAST, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return buildListResponse(rows, page, limit);
};

const listAdmin = async (filters) => {
  const page = toPage(filters.page);
  const limit = toLimit(filters.limit);
  const offset = (page - 1) * limit;
  const params = [];
  const where = [];

  if (filters.keyword) {
    params.push(`%${filters.keyword}%`);
    where.push(`(title ILIKE $${params.length} OR doc_number ILIKE $${params.length})`);
  }

  if (filters.category) {
    params.push(filters.category);
    where.push(`category = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }

  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM website_documents
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY display_order ASC, issued_date DESC NULLS LAST, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return buildListResponse(rows, page, limit);
};

const create = async (payload, userId) => {
  const {
    title,
    doc_number = null,
    issued_by = null,
    issued_date = null,
    category,
    file_url = null,
    file_size = null,
    status = "active",
    display_order = 0,
    is_visible = true,
  } = payload;

  const { rows } = await db.query(
    `INSERT INTO website_documents
       (title, doc_number, issued_by, issued_date, category, file_url, file_size,
        status, display_order, is_visible, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      title,
      doc_number,
      issued_by,
      issued_date,
      category,
      file_url,
      file_size,
      status,
      display_order,
      is_visible,
      userId,
    ],
  );

  return rows[0];
};

const update = async (id, payload) => {
  const fields = [];
  const values = [];
  const allowedFields = [
    "title",
    "doc_number",
    "issued_by",
    "issued_date",
    "category",
    "file_url",
    "file_size",
    "status",
    "display_order",
    "is_visible",
  ];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      values.push(payload[field]);
      fields.push(`${field} = $${values.length}`);
    }
  });

  values.push(id);

  const { rows } = await db.query(
    `UPDATE website_documents
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );

  return rows[0] || null;
};

const remove = async (id) => {
  const { rows } = await db.query(
    "DELETE FROM website_documents WHERE id = $1 RETURNING id",
    [id],
  );
  return rows[0] || null;
};

module.exports = { listPublic, listAdmin, create, update, remove };

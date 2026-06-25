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

const listPublic = async () => {
  const { rows } = await db.query(
    `SELECT *
     FROM website_quick_links
     WHERE is_visible = true
     ORDER BY display_order ASC, created_at DESC`,
  );

  return rows;
};

const listAdmin = async (filters) => {
  const page = toPage(filters.page);
  const limit = toLimit(filters.limit);
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM website_quick_links
     ORDER BY display_order ASC, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return buildListResponse(rows, page, limit);
};

const create = async (payload, userId) => {
  const {
    title,
    url = null,
    display_order = 0,
    is_visible = true,
  } = payload;

  const { rows } = await db.query(
    `INSERT INTO website_quick_links
       (title, url, display_order, is_visible, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, url, display_order, is_visible, userId],
  );

  return rows[0];
};

const update = async (id, payload) => {
  const fields = [];
  const values = [];
  const allowedFields = [
    "title",
    "url",
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
    `UPDATE website_quick_links
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );

  return rows[0] || null;
};

const remove = async (id) => {
  const { rows } = await db.query(
    "DELETE FROM website_quick_links WHERE id = $1 RETURNING id",
    [id],
  );
  return rows[0] || null;
};

module.exports = { listPublic, listAdmin, create, update, remove };

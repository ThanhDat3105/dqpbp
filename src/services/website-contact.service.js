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

const create = async (payload) => {
  const { full_name, phone, email = null, subject = null, message } = payload;
  const { rows } = await db.query(
    `INSERT INTO website_contacts (full_name, phone, email, subject, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [full_name, phone, email, subject, message],
  );
  return rows[0];
};

const listAdmin = async (filters) => {
  const page = toPage(filters.page);
  const limit = toLimit(filters.limit);
  const offset = (page - 1) * limit;
  const params = [];
  const where = [];

  if (filters.is_read !== undefined) {
    params.push(filters.is_read);
    where.push(`is_read = $${params.length}`);
  }

  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM website_contacts
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return buildListResponse(rows, page, limit);
};

const markRead = async (id) => {
  const { rows } = await db.query(
    "UPDATE website_contacts SET is_read = true WHERE id = $1 RETURNING *",
    [id],
  );
  return rows[0] || null;
};

module.exports = { create, listAdmin, markRead };

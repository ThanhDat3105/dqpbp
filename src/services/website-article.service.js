"use strict";

const db = require("../config/db");
const slugify = require("../utils/slugify");

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

const ensureUniqueSlug = async (title, id) => {
  const baseSlug = slugify(title) || `article-${id}`;
  const { rows } = await db.query(
    "SELECT id FROM website_articles WHERE slug = $1 AND id <> $2 LIMIT 1",
    [baseSlug, id],
  );
  return rows.length > 0 ? `${baseSlug}-${id}` : baseSlug;
};

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

  if (filters.featured !== undefined) {
    params.push(filters.featured);
    where.push(`is_featured = $${params.length}`);
  }

  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM website_articles
     WHERE ${where.join(" AND ")}
     ORDER BY display_order ASC, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return buildListResponse(rows, page, limit);
};

const getPublicById = async (id) => {
  const { rows } = await db.query(
    "SELECT * FROM website_articles WHERE id = $1 AND is_visible = true LIMIT 1",
    [id],
  );
  return rows[0] || null;
};

const listAdmin = async (filters) => {
  const page = toPage(filters.page);
  const limit = toLimit(filters.limit);
  const offset = (page - 1) * limit;
  const params = [];
  const where = [];

  if (filters.keyword) {
    params.push(`%${filters.keyword}%`);
    where.push(`(title ILIKE $${params.length} OR slug ILIKE $${params.length})`);
  }

  if (filters.category) {
    params.push(filters.category);
    where.push(`category = $${params.length}`);
  }

  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM website_articles
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY display_order ASC, created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return buildListResponse(rows, page, limit);
};

const create = async (payload, userId) => {
  const {
    title,
    category,
    content = null,
    thumbnail_url = null,
    display_order = 0,
    is_featured = false,
    is_visible = true,
  } = payload;

  const { rows } = await db.query(
    `INSERT INTO website_articles
       (title, content, category, thumbnail_url, display_order, is_featured, is_visible, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      title,
      content,
      category,
      thumbnail_url,
      display_order,
      is_featured,
      is_visible,
      userId,
    ],
  );

  const article = rows[0];
  const slug = await ensureUniqueSlug(title, article.id);
  const { rows: updatedRows } = await db.query(
    "UPDATE website_articles SET slug = $1 WHERE id = $2 RETURNING *",
    [slug, article.id],
  );

  return updatedRows[0];
};

const update = async (id, payload) => {
  const fields = [];
  const values = [];
  const allowedFields = [
    "title",
    "category",
    "content",
    "thumbnail_url",
    "display_order",
    "is_featured",
    "is_visible",
  ];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      values.push(payload[field]);
      fields.push(`${field} = $${values.length}`);
    }
  });

  if (payload.title) {
    const slug = await ensureUniqueSlug(payload.title, id);
    values.push(slug);
    fields.push(`slug = $${values.length}`);
  }

  values.push(id);

  const { rows } = await db.query(
    `UPDATE website_articles
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );

  return rows[0] || null;
};

const remove = async (id) => {
  const { rows } = await db.query(
    "DELETE FROM website_articles WHERE id = $1 RETURNING id",
    [id],
  );
  return rows[0] || null;
};

const toggleVisible = async (id) => {
  const { rows } = await db.query(
    `UPDATE website_articles
     SET is_visible = NOT is_visible, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
  return rows[0] || null;
};

module.exports = {
  listPublic,
  getPublicById,
  listAdmin,
  create,
  update,
  remove,
  toggleVisible,
};

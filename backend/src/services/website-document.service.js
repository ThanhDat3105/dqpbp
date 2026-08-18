"use strict";

const db = require("../config/db");
const { BadRequestError } = require("../core/error.response");
const { deleteFromR2, uploadToR2 } = require("./r2.service");

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

const normalizeOriginalFileName = (value) => String(value || "");

const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;
  return String(size);
};

const create = async (payload, userId, file) => {
  if (!file) {
    throw new BadRequestError("File is required");
  }

  const {
    title,
    doc_number = null,
    issued_by = null,
    issued_date = null,
    category,
    status = "active",
    display_order = 0,
    is_visible = true,
  } = payload;

  const originalName = normalizeOriginalFileName(file.originalname);
  const fileUrl = await uploadToR2(
    file.buffer,
    originalName,
    file.mimetype,
    "website-documents",
  );

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
      fileUrl,
      formatFileSize(file.size),
      status,
      display_order,
      is_visible,
      userId,
    ],
  );

  return rows[0];
};

const update = async (id, payload, file) => {
  const fields = [];
  const values = [];
  let previousFileUrl = null;
  let uploadedFileUrl = null;
  const allowedFields = [
    "title",
    "doc_number",
    "issued_by",
    "issued_date",
    "category",
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

  if (file) {
    const { rows: existingRows } = await db.query(
      "SELECT file_url FROM website_documents WHERE id = $1",
      [id],
    );

    if (existingRows.length === 0) return null;

    previousFileUrl = existingRows[0].file_url;

    const originalName = normalizeOriginalFileName(file.originalname);
    const fileUrl = await uploadToR2(
      file.buffer,
      originalName,
      file.mimetype,
      "website-documents",
    );
    uploadedFileUrl = fileUrl;

    values.push(fileUrl);
    fields.push(`file_url = $${values.length}`);
    values.push(formatFileSize(file.size));
    fields.push(`file_size = $${values.length}`);
  }

  if (fields.length === 0) {
    throw new BadRequestError("No data to update");
  }

  values.push(id);

  let rows;
  try {
    ({ rows } = await db.query(
      `UPDATE website_documents
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    ));
  } catch (error) {
    if (uploadedFileUrl) {
      try {
        await deleteFromR2(uploadedFileUrl);
      } catch (deleteError) {
        console.error("Failed to delete uploaded website document file", deleteError);
      }
    }
    throw error;
  }

  if (rows[0] && previousFileUrl) {
    try {
      await deleteFromR2(previousFileUrl);
    } catch (error) {
      console.error("Failed to delete old website document file", error);
    }
  }

  return rows[0] || null;
};

const remove = async (id) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query(
      "SELECT id, file_url FROM website_documents WHERE id = $1 FOR UPDATE",
      [id],
    );

    if (existingRows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    if (existingRows[0].file_url) {
      await deleteFromR2(existingRows[0].file_url);
    }

    const { rows } = await client.query(
      "DELETE FROM website_documents WHERE id = $1 RETURNING id",
      [id],
    );

    await client.query("COMMIT");
    return rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { listPublic, listAdmin, create, update, remove };

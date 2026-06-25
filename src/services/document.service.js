"use strict";

const db = require("../config/db");
const { uploadToR2, deleteFromR2 } = require("./r2.service");
const { BadRequestError, NotFoundError } = require("../core/error.response");

const PRIVILEGED_ROLES = ["CHI_HUY", "TO_TRUONG", "ADMIN"];

const normalizeBooleanFilter = (value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  return null;
};

const normalizeOriginalFileName = (value) => {
  const fileName = String(value || "");

  if (!/[ÃÂÄáºá»]/.test(fileName)) return fileName;

  return Buffer.from(fileName, "latin1").toString("utf8");
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

  const originalName = normalizeOriginalFileName(file.originalname);
  const title = String(payload.title || originalName || "").trim();
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
    originalName,
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
      originalName,
      isPublic,
      user.user_id,
      departmentId,
    ],
  );

  return rows[0];
};

const updateDocument = async ({ id, file, payload }) => {
  const values = [];
  const fields = [];
  let uploadedFileUrl = null;

  const addField = (field, value) => {
    values.push(value);
    fields.push(`${field} = $${values.length}`);
  };

  if (payload.title !== undefined) {
    const title = String(payload.title || "").trim();
    if (!title) {
      throw new BadRequestError("title is required");
    }
    addField("title", title);
  }

  if (payload.description !== undefined) {
    addField(
      "description",
      payload.description ? String(payload.description).trim() : null,
    );
  }

  const payloadDepartmentId = payload.department_id ?? payload.departmentId;
  if (payloadDepartmentId !== undefined) {
    const departmentId = Number(payloadDepartmentId);
    if (!departmentId) {
      throw new BadRequestError("department_id is required");
    }
    addField("department_id", departmentId);
  }

  const payloadIsPublic = payload.is_public ?? payload.isPublic;
  if (payloadIsPublic !== undefined) {
    addField("is_public", normalizeBooleanFilter(payloadIsPublic) ?? false);
  }

  if (!file && fields.length === 0) {
    throw new BadRequestError("No data to update");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query(
      "SELECT id, file_url FROM documents WHERE id = $1 FOR UPDATE",
      [id],
    );

    if (existingRows.length === 0) {
      throw new NotFoundError("Document not found");
    }

    if (file) {
      const originalName = normalizeOriginalFileName(file.originalname);
      uploadedFileUrl = await uploadToR2(
        file.buffer,
        originalName,
        file.mimetype,
        "documents",
      );

      if (existingRows[0].file_url) {
        await deleteFromR2(existingRows[0].file_url);
      }

      addField("file_url", uploadedFileUrl);
      addField("file_name", originalName);
    }

    values.push(id);
    const { rows } = await client.query(
      `UPDATE documents
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values,
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    if (uploadedFileUrl) {
      try {
        await deleteFromR2(uploadedFileUrl);
      } catch (deleteError) {
        console.error("Failed to delete uploaded document file", deleteError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
};

const removeDocument = async (id) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows: existingRows } = await client.query(
      "SELECT id, file_url FROM documents WHERE id = $1 FOR UPDATE",
      [id],
    );

    if (existingRows.length === 0) {
      throw new NotFoundError("Document not found");
    }

    if (existingRows[0].file_url) {
      await deleteFromR2(existingRows[0].file_url);
    }

    const { rows } = await client.query(
      "DELETE FROM documents WHERE id = $1 RETURNING id",
      [id],
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  fetchList,
  uploadDocument,
  updateDocument,
  removeDocument,
};

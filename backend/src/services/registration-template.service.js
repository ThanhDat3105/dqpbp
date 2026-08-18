"use strict";

const db = require("../config/db");

const listByCategory = async (category) => {
  const params = [];
  const where = ["is_active = true"];

  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }

  const { rows } = await db.query(
    `SELECT id, name, code, file_type, required, description, size, file_url
     FROM registration_templates
     WHERE ${where.join(" AND ")}
     ORDER BY display_order ASC, id ASC`,
    params,
  );

  return rows;
};

module.exports = { listByCategory };

'use strict';

const db = require('../config/db');

const getAll = async ({ search }) => {
    const { rows } = await db.query(
        `SELECT id, code, name, created_at, updated_at FROM departments 
     WHERE ($1::text IS NULL OR name ILIKE '%'||$1||'%' OR code ILIKE '%'||$1||'%')
     ORDER BY name ASC`,
        [search || null]
    );
    return rows;
};

const getById = async (id) => {
    const { rows } = await db.query(
        `SELECT id, code, name, created_at, updated_at FROM departments WHERE id = $1`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
};

const create = async ({ code, name }) => {
    const { rows } = await db.query(
        `INSERT INTO departments (code, name, created_at, updated_at) 
     VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
        [code, name]
    );
    return rows[0];
};

const update = async (id, { name }) => {
    const { rows } = await db.query(
        `UPDATE departments SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [name, id]
    );
    return rows.length > 0 ? rows[0] : null;
};

const remove = async (id) => {
    const { rows } = await db.query(
        `DELETE FROM departments WHERE id = $1 RETURNING id`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
};

const countUsersByDepartmentId = async (id) => {
    const { rows } = await db.query(
        `SELECT COUNT(*) FROM users WHERE department_id = $1`,
        [id]
    );
    return parseInt(rows[0].count, 10);
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    countUsersByDepartmentId
};

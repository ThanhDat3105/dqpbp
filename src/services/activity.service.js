const pool = require("../config/db");

const getActivities = async () => {
  const result = await pool.query("SELECT * FROM activities ORDER BY id DESC");
  return result.rows;
};

const getActivityById = async (id) => {
  const result = await pool.query("SELECT * FROM activities WHERE id = $1", [
    id,
  ]);
  return result.rows[0];
};

const createActivity = async (activityData) => {
  const {
    name,
    work_type,
    department,
    start_date,
    end_date,
    location,
    document_number,
    attached_files,
    created_by,
    created_at,
    updated_at,
  } = activityData;

  const result = await pool.query(
    "INSERT INTO activities (name, work_type, department, start_date, end_date, location, document_number, attached_files, created_by, created_at, updated_at, tasks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
    [
      name,
      work_type,
      department,
      start_date,
      end_date,
      location,
      document_number,
      attached_files ? JSON.stringify(attached_files) : null,
      tasks ? JSON.stringify(tasks) : null,
      created_by,
      created_at,
      updated_at,
    ],
  );

  return result.rows[0];
};

const updateStatusActivity = async (id, status) => {
  const result = await pool.query(
    "UPDATE activities SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id],
  );
  return result.rows[0];
};

module.exports = {
  getActivities,
  createActivity,
  getActivityById,
  updateStatusActivity,
};

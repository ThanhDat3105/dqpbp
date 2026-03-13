const pool = require("../config/db");

const createActivityTask = async (taskData) => {
  const {
    activity_id,
    title,
    team,
    assignees,
    due_date,
    report_fields,
    notes,
    completed,
    completed_at,
    status,
    accepted_at,
    created_at,
    updated_at,
  } = taskData;

  const result = await pool.query(
    `INSERT INTO activity_tasks (
      activity_id,
      title,
      team,
      assignees,
      due_date,
      report_fields,
      notes,
      completed,
      completed_at,
      status,
      accepted_at,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [
      activity_id,
      title,
      team,
      assignees,
      due_date,
      report_fields,
      notes,
      completed,
      completed_at,
      status,
      accepted_at,
      created_at,
      updated_at,
    ],
  );

  return result.rows[0];
};

const updateActivityTaskStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE activity_tasks
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id],
  );

  return result.rows[0];
};

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
};

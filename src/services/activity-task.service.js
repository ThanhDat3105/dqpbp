const pool = require("../config/db");
const { BadRequestError, NotFoundError } = require("../core/error.response");

async function checkAndCompleteActivity(activityId, client) {
  const { rows } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status != 'completed') AS incomplete_count,
      COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'completed') AS progress_count,
      COUNT(*) AS total_count
    FROM activity_tasks
    WHERE activity_id = $1
  `, [activityId]);

  const { incomplete_count, progress_count, total_count } = rows[0];

  if (parseInt(total_count) === 0) return;

  if (parseInt(incomplete_count) === 0) {
    await client.query(`
      UPDATE activities
      SET status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND completed_at IS NULL
    `, [activityId]);
  } else {
    const newStatus = parseInt(progress_count) > 0 ? 'in_progress' : 'pending';
    await client.query(`
      UPDATE activities
      SET status = $2,
          completed_at = NULL,
          updated_at = NOW()
      WHERE id = $1 AND (completed_at IS NOT NULL OR status != $2)
    `, [activityId, newStatus]);
  }
}

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
    VALUES ($1,$2,$3::TEXT[],$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, fetch the task to validate report_fields and check existence
    const taskResult = await client.query(
      `SELECT id, activity_id, report_fields FROM activity_tasks WHERE id = $1`,
      [id],
    );

    // Check if task exists
    if (taskResult.rows.length === 0) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    const task = taskResult.rows[0];

    // If status is being updated to "completed", validate report_fields
    if (status === "completed") {
      let reportFields = task.report_fields;

      // Handle null/undefined report_fields
      if (!reportFields) {
        throw new BadRequestError(
          "All report fields must be filled before completing the task",
        );
      }

      if (typeof reportFields === "string") {
        try {
          reportFields = JSON.parse(reportFields);
        } catch (error) {
          throw new BadRequestError(
            "All report fields must be filled before completing the task",
          );
        }
      }

      if (!Array.isArray(reportFields)) {
        throw new BadRequestError(
          "All report fields must be filled before completing the task",
        );
      }

      const isValid = reportFields.every(
        (field) =>
          field && // field exists
          typeof field.name === "string" &&
          typeof field.value === "string" &&
          field.value.trim().length > 0,
      );

      if (!isValid) {
        throw new BadRequestError(
          "All report fields must be filled before completing the task",
        );
      }
    }

    // Build the update query with conditional completed_at
    let query;
    let params;

    if (status === "completed") {
      query = `
        UPDATE activity_tasks
        SET status = $1,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      params = [status, id];
    } else {
      query = `
        UPDATE activity_tasks
        SET status = $1,
            completed_at = NULL,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      params = [status, id];
    }

    const result = await client.query(query, params);
    const updatedTask = result.rows[0];

    // 2. Check and auto-complete activity
    await checkAndCompleteActivity(updatedTask.activity_id, client);

    await client.query('COMMIT');
    return updatedTask;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Partial update for activity task
 * Only updates fields provided in updateData
 * Forbidden fields: id, activity_id, created_at, created_by
 *
 * @param {number} taskId - Task ID
 * @param {number} activityId - Activity ID (for validation)
 * @param {object} updateData - Fields to update
 * @returns {object} Updated task row
 */
const updateActivityTask = async (taskId, activityId, updateData) => {
  // Forbidden fields that cannot be updated
  const forbiddenFields = ["id", "activity_id", "created_at", "created_by"];

  // Allowed fields for update
  const allowedFields = [
    "title",
    "team",
    "assignees",
    "due_date",
    "report_fields",
    "notes",
    "completed",
    "status",
    "completed_at",
    "accepted_at",
  ];

  // Filter to only allowed fields
  const fieldsToUpdate = {};
  for (const key of Object.keys(updateData)) {
    if (forbiddenFields.includes(key)) {
      continue; // Skip forbidden fields
    }
    if (allowedFields.includes(key)) {
      fieldsToUpdate[key] = updateData[key];
    }
  }

  // Validate that we have fields to update
  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new BadRequestError("No valid fields provided for update");
  }

  // Handle special case: completed_at logic
  if ("completed" in fieldsToUpdate) {
    if (fieldsToUpdate.completed === true) {
      // If completed = true, set completed_at to NOW() if not provided
      if (!("completed_at" in fieldsToUpdate)) {
        fieldsToUpdate.completed_at = new Date();
      }
    } else if (fieldsToUpdate.completed === false) {
      // If completed = false, set completed_at to NULL
      fieldsToUpdate.completed_at = null;
    }
  }

  // Validate status field if provided
  if ("status" in fieldsToUpdate) {
    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(fieldsToUpdate.status)) {
      throw new BadRequestError(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if ("report_fields" in fieldsToUpdate) {
      if (fieldsToUpdate.report_fields !== null) {
        if (!Array.isArray(fieldsToUpdate.report_fields)) {
          throw new BadRequestError("report_fields must be a JSON array");
        }

        const current = await client.query(
          `SELECT report_fields FROM activity_tasks WHERE id = $1 AND activity_id = $2`,
          [taskId, activityId],
        );

        let existingFields = [];
        if (current.rows[0]?.report_fields) {
          existingFields = current.rows[0].report_fields;
          // Nếu DB đang lưu dạng string thì parse
          if (typeof existingFields === "string") {
            existingFields = JSON.parse(existingFields);
          }
        }

        // 🔥 Merge dữ liệu
        const incomingFields = fieldsToUpdate.report_fields;

        const merged = existingFields.map((field) => {
          const updated = incomingFields.find((f) => f.name === field.name);
          return updated ? { ...field, ...updated } : field;
        });

        // Nếu FE gửi field mới chưa tồn tại thì thêm vào
        incomingFields.forEach((f) => {
          const exists = existingFields.find((ef) => ef.name === f.name);
          if (!exists) {
            merged.push(f);
          }
        });

        fieldsToUpdate.report_fields = JSON.stringify(merged);
      }
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      // Cast team to TEXT[] explicitly so pg sends it as a PostgreSQL array
      if (key === "team") {
        updates.push(`team = $${paramIndex}::TEXT[]`);
      } else {
        updates.push(`${key} = $${paramIndex}`);
      }
      values.push(value);
      paramIndex++;
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // Add WHERE conditions
    values.push(taskId);
    values.push(activityId);

    const query = `
      UPDATE activity_tasks
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex} AND activity_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await client.query(query, values);
    const updatedTask = result.rows[0];

    // Check and auto-complete activity
    await checkAndCompleteActivity(activityId, client);

    await client.query('COMMIT');
    return updatedTask;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
  updateActivityTask,
};

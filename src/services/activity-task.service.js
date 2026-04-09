const pool = require("../config/db");
const { BadRequestError, NotFoundError } = require("../core/error.response");

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
  // First, fetch the task to validate report_fields and check existence
  const taskResult = await pool.query(
    `SELECT id, report_fields FROM activity_tasks WHERE id = $1`,
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

  const result = await pool.query(query, params);

  const updatedTask = result.rows[0];

  // ── Sync parent activity status ───────────────────────────────────────────
  // Fetch the status of every task that belongs to the same activity
  const siblingsResult = await pool.query(
    `SELECT status FROM activity_tasks WHERE activity_id = $1`,
    [updatedTask.activity_id],
  );

  const allTasks = siblingsResult.rows;

  const allCompleted = allTasks.every((t) => t.status === "completed");
  // "has progress" = at least one task is in_progress OR completed
  const hasProgress = allTasks.some(
    (t) => t.status === "in_progress" || t.status === "completed",
  );

  let newActivityStatus;
  if (allCompleted) {
    newActivityStatus = "completed";
  } else if (hasProgress) {
    newActivityStatus = "in_progress";
  } else {
    newActivityStatus = "pending";
  }

  await pool.query(
    `UPDATE activities SET status = $1, updated_at = NOW() WHERE id = $2`,
    [newActivityStatus, updatedTask.activity_id],
  );

  return updatedTask;
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

  if ("report_fields" in fieldsToUpdate) {
    if (fieldsToUpdate.report_fields !== null) {
      if (!Array.isArray(fieldsToUpdate.report_fields)) {
        throw new BadRequestError("report_fields must be a JSON array");
      }

      // 🔥 Lấy dữ liệu cũ từ DB
      const current = await pool.query(
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

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
  updateActivityTask,
};

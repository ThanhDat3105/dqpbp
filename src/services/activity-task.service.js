const pool = require("../config/db");
const { BadRequestError, NotFoundError } = require("../core/error.response");

async function checkAndCompleteActivity(activityId, client) {
  const { rows } = await client.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status != 'completed') AS incomplete_count,
      COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'completed') AS progress_count,
      COUNT(*) AS total_count
    FROM activity_tasks
    WHERE activity_id = $1
  `,
    [activityId],
  );

  const { incomplete_count, progress_count, total_count } = rows[0];

  if (parseInt(total_count) === 0) return;

  if (parseInt(incomplete_count) === 0) {
    await client.query(
      `
      UPDATE activities
      SET status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND completed_at IS NULL
    `,
      [activityId],
    );
  } else {
    const newStatus = parseInt(progress_count) > 0 ? "in_progress" : "pending";
    await client.query(
      `
      UPDATE activities
      SET status = $2,
          completed_at = NULL,
          updated_at = NOW()
      WHERE id = $1 AND (completed_at IS NOT NULL OR status != $2)
    `,
      [activityId, newStatus],
    );
  }
}

const parseMediaFiles = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const createActivityTask = async (taskData) => {
  const {
    activity_id,
    title,
    team,
    due_date,
    report_fields,
    notes,
    completed,
    completed_at,
    status,
    accepted_at,
    created_at,
    updated_at,
    require_media_report = false,
  } = taskData;

  const result = await pool.query(
    `INSERT INTO activity_tasks (
      activity_id,
      title,
      team,
      due_date,
      report_fields,
      notes,
      completed,
      completed_at,
      status,
      accepted_at,
      require_media_report,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3::TEXT[],$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING id`,
    [
      activity_id,
      title,
      team,
      due_date,
      report_fields,
      notes,
      completed,
      completed_at,
      status,
      accepted_at,
      require_media_report,
      created_at,
      updated_at,
    ],
  );

  const insertedTaskId = result.rows[0].id;
  if (Array.isArray(taskData.assignees) && taskData.assignees.length > 0) {
    for (const userId of taskData.assignees) {
      await pool.query(
        `INSERT INTO task_assignees (task_id, user_id, role) VALUES ($1, $2, $3)`,
        [insertedTaskId, userId, "DQTT"],
      );
    }
  }

  return result.rows[0];
};

const updateActivityTaskStatus = async (id, { status, media_files = [] }) => {
  const validStatuses = ["pending", "in_progress", "completed"];

  if (!validStatuses.includes(status)) {
    throw new BadRequestError(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 🔒 Lock row để tránh race condition
    const taskResult = await client.query(
      `SELECT id, activity_id, report_fields, require_media_report, media_files
       FROM activity_tasks 
       WHERE id = $1 
       FOR UPDATE`,
      [id],
    );

    if (taskResult.rows.length === 0) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    const task = taskResult.rows[0];
    const nextMediaFiles =
      media_files.length > 0 ? media_files : parseMediaFiles(task.media_files);

    // ✅ Validate report_fields khi complete
    if (status === "completed") {
      let reportFields = task.report_fields;

      if (!reportFields) {
        throw new BadRequestError(
          "All report fields must be filled before completing the task",
        );
      }

      if (typeof reportFields === "string") {
        try {
          reportFields = JSON.parse(reportFields);
        } catch {
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
          field &&
          typeof field.name === "string" &&
          typeof field.value === "string" &&
          field.value.trim().length > 0,
      );

      if (!isValid) {
        throw new BadRequestError(
          "All report fields must be filled before completing the task",
        );
      }

      if (task.require_media_report && nextMediaFiles.length === 0) {
        throw new BadRequestError("Vui lòng đính kèm ít nhất 1 ảnh hoặc file");
      }
    }

    // 🔥 Update task
    let query;
    let params;

    if (status === "completed") {
      query = `
        UPDATE activity_tasks
        SET status = $1,
            completed_at = NOW(),
            media_files = $2::jsonb,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      params = [status, JSON.stringify(nextMediaFiles), id];
    } else {
      query = `
        UPDATE activity_tasks
        SET status = $1,
            completed_at = NULL,
            media_files = CASE
              WHEN $2::jsonb = '[]'::jsonb THEN media_files
              ELSE $2::jsonb
            END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      params = [status, JSON.stringify(nextMediaFiles), id];
    }

    const result = await client.query(query, params);
    const updatedTask = result.rows[0];

    // 🔥 Auto update activity (giữ nguyên hàm của bạn)
    await checkAndCompleteActivity(updatedTask.activity_id, client);

    await client.query("COMMIT");
    return updatedTask;
  } catch (err) {
    await client.query("ROLLBACK");
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
  const hasAssigneesUpdate = Array.isArray(updateData.assignees);
  if (Object.keys(fieldsToUpdate).length === 0 && !hasAssigneesUpdate) {
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
    await client.query("BEGIN");

    if (Array.isArray(updateData.assignees)) {
      await client.query(`DELETE FROM task_assignees WHERE task_id = $1`, [
        taskId,
      ]);
      for (const userId of updateData.assignees) {
        await client.query(
          `INSERT INTO task_assignees (task_id, user_id, role) VALUES ($1, $2, $3)`,
          [taskId, userId, "DQTT"],
        );
      }
    }

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

    await client.query("COMMIT");
    return updatedTask;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const getTaskList = async ({
  assignee = null,
  limit = 20,
  sort = "due_date_desc",
  status = null,
  activity_id = null,
}) => {
  const clampedLimit = Math.min(limit, 50);

  if (assignee !== null) {
    const userResult = await pool.query(
      `SELECT id FROM users WHERE id = $1 LIMIT 1`,
      [assignee],
    );

    if (userResult.rows.length === 0) {
      return {
        tasks: [],
        total: 0,
      };
    }
  }

  const conditions = ["1=1"];
  const params = [];

  if (assignee !== null) {
    params.push(assignee);
    conditions.push(`ta.user_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (activity_id !== null) {
    params.push(activity_id);
    conditions.push(`t.activity_id = $${params.length}`);
  }

  const sortMapping = {
    due_date_asc: "tasks.due_date ASC NULLS LAST",
    due_date_desc: "tasks.due_date DESC NULLS LAST",
    created_desc: "tasks.created_at DESC",
  };

  const orderBy = sortMapping[sort] || sortMapping.due_date_desc;
  params.push(clampedLimit);

  const query = `
    SELECT
      tasks.id,
      tasks.title,
      tasks.status,
      tasks.due_date,
      tasks.completed_at,
      tasks.notes,
      tasks.requires_dqcd,
      tasks.activity_id,
      tasks.activity_name,
      tasks.work_type
    FROM (
      SELECT DISTINCT
        t.id,
        t.title,
        t.status,
        t.due_date,
        t.completed_at,
        t.notes,
        t.requires_dqcd,
        t.created_at,
        a.id AS activity_id,
        a.name AS activity_name,
        a.work_type
      FROM activity_tasks t
      JOIN activities a ON a.id = t.activity_id
      JOIN task_assignees ta ON ta.task_id = t.id
      WHERE ${conditions.join(" AND ")}
    ) tasks
    ORDER BY ${orderBy}
    LIMIT $${params.length}
  `;

  const result = await pool.query(query, params);

  return {
    tasks: result.rows,
    total: result.rows.length,
  };
};

const assignDQCD = async (taskId, userIds) => {
  const taskResult = await pool.query(
    `SELECT id, requires_dqcd, due_date FROM activity_tasks WHERE id = $1`,
    [taskId],
  );

  if (taskResult.rows.length === 0) throw new NotFoundError("Task not found");
  if (!taskResult.rows[0].requires_dqcd)
    throw new BadRequestError("Task does not allow DQCD assignment");

  const userCheck = await pool.query(
    `SELECT id FROM users WHERE id = ANY($1) AND role = 'DQCD'`,
    [userIds],
  );
  if (userCheck.rows.length !== userIds.length)
    throw new BadRequestError("One or more users are not DQCD");

  const dueDate = new Date(taskResult.rows[0].due_date);
  const day = dueDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dueDate.setUTCDate(dueDate.getUTCDate() + diff);
  const weekStart = dueDate.toISOString().split("T")[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const userId of userIds) {
      const insertResult = await client.query(
        `INSERT INTO task_assignees (task_id, user_id, role)
         VALUES ($1, $2, 'DQCD')
         ON CONFLICT (task_id, user_id) DO NOTHING
         RETURNING task_id`,
        [taskId, userId],
      );

      if (insertResult.rowCount > 0) {
        await client.query(
          `INSERT INTO dqcd_mobilize_summary (user_id, week_start, mobilize_count)
           VALUES ($1, $2, 1)
           ON CONFLICT (user_id, week_start)
           DO UPDATE SET
             mobilize_count = dqcd_mobilize_summary.mobilize_count + 1,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, weekStart],
        );
      }
    }

    await client.query("COMMIT");

    const result = await client.query(
      `SELECT u.id, u.name, u.role, ta.role AS assigned_role
       FROM task_assignees ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.task_id = $1`,
      [taskId],
    );
    return result.rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const updateDQCDAssignees = async (taskId, userIds) => {
  const taskResult = await pool.query(
    `SELECT id, requires_dqcd, due_date FROM activity_tasks WHERE id = $1`,
    [taskId],
  );

  if (taskResult.rows.length === 0) throw new NotFoundError("Task not found");
  if (!taskResult.rows[0].requires_dqcd)
    throw new BadRequestError("Task does not allow DQCD assignment");

  if (userIds.length > 0) {
    const userCheck = await pool.query(
      `SELECT id FROM users WHERE id = ANY($1) AND role = 'DQCD'`,
      [userIds],
    );
    if (userCheck.rows.length !== userIds.length)
      throw new BadRequestError("One or more users are not DQCD");
  }

  const dueDate = new Date(taskResult.rows[0].due_date);
  const day = dueDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dueDate.setUTCDate(dueDate.getUTCDate() + diff);
  const weekStart = dueDate.toISOString().split("T")[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT user_id FROM task_assignees WHERE task_id = $1 AND role = 'DQCD'`,
      [taskId],
    );
    const currentIds = currentResult.rows.map((r) => r.user_id);
    const toAdd = userIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !userIds.includes(id));

    for (const userId of toRemove) {
      await client.query(
        `DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2 AND role = 'DQCD'`,
        [taskId, userId],
      );
      await client.query(
        `UPDATE dqcd_mobilize_summary
         SET mobilize_count = GREATEST(mobilize_count - 1, 0),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND week_start = $2`,
        [userId, weekStart],
      );
    }

    for (const userId of toAdd) {
      await client.query(
        `INSERT INTO task_assignees (task_id, user_id, role)
         VALUES ($1, $2, 'DQCD')
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [taskId, userId],
      );
      await client.query(
        `INSERT INTO dqcd_mobilize_summary (user_id, week_start, mobilize_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, week_start)
         DO UPDATE SET
           mobilize_count = dqcd_mobilize_summary.mobilize_count + 1,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, weekStart],
      );
    }

    await client.query("COMMIT");

    const result = await client.query(
      `SELECT u.id, u.name, u.role, ta.role AS assigned_role
       FROM task_assignees ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.task_id = $1`,
      [taskId],
    );
    return result.rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createActivityTask,
  updateActivityTaskStatus,
  updateActivityTask,
  getTaskList,
  assignDQCD,
  updateDQCDAssignees,
};

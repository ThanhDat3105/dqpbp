"use strict";

const pool = require("../config/db");
const { ForbiddenError, NotFoundError } = require("../core/error.response");

const formatDate = (value) => new Date(value).toISOString().split("T")[0];

const getNotificationsByUser = async (
  userId,
  { is_read, limit = 20, offset = 0 } = {},
) => {
  const params = [userId];
  let whereSQL = "WHERE user_id = $1";

  if (typeof is_read === "boolean") {
    params.push(is_read);
    whereSQL += ` AND is_read = $${params.length}`;
  }

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM notifications
    ${whereSQL}
  `,
    params,
  );

  const total = Number(countResult.rows[0]?.total ?? 0);

  const dataResult = await pool.query(
    `
    SELECT id, type, title, body, metadata, is_read, created_at
    FROM notifications
    ${whereSQL}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `,
    [...params, limit, offset],
  );

  const unreadResult = await pool.query(
    `
    SELECT COUNT(*)::int AS unread_count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `,
    [userId],
  );

  const unread_count = Number(unreadResult.rows[0]?.unread_count ?? 0);

  return { data: dataResult.rows, unread_count, total };
};

const markAsRead = async (notificationId, userId) => {
  const { rows } = await pool.query(
    `
    SELECT id, user_id
    FROM notifications
    WHERE id = $1
    LIMIT 1
  `,
    [notificationId],
  );

  if (rows.length === 0) {
    throw new NotFoundError("Notification not found");
  }

  if (Number(rows[0].user_id) !== Number(userId)) {
    throw new ForbiddenError("Forbidden");
  }

  const updateResult = await pool.query(
    `
    UPDATE notifications
    SET is_read = true, updated_at = NOW()
    WHERE id = $1
    RETURNING id, is_read, updated_at
  `,
    [notificationId],
  );

  return updateResult.rows[0];
};

const getTodayDigest = async (userId) => {
  const { rows } = await pool.query(
    `
    SELECT id, user_id, digest_date, tasks, unread_count, created_at
    FROM daily_task_digests
    WHERE user_id = $1
      AND digest_date = CURRENT_DATE
  `,
    [userId],
  );

  if (rows.length === 0) {
    return {
      digest_date: formatDate(new Date()),
      tasks: [],
      unread_count: 0,
    };
  }

  return rows[0];
};

const markTaskAsRead = async (userId, taskId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateResult = await client.query(
      `
      UPDATE daily_task_digests
      SET
        tasks = (
          SELECT COALESCE(
            jsonb_agg(
              CASE
                WHEN (elem->>'task_id')::integer = $2
                THEN elem || '{"is_read": true}'::jsonb
                ELSE elem
              END
            ),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(tasks) AS elem
        ),
        updated_at = NOW()
      WHERE user_id = $1
        AND digest_date = CURRENT_DATE
      RETURNING tasks
    `,
      [userId, taskId],
    );

    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { tasks: [], unread_count: 0 };
    }

    const tasks = updateResult.rows[0].tasks ?? [];

    const countResult = await client.query(
      `
      UPDATE daily_task_digests
      SET unread_count = (
        SELECT COUNT(*)
        FROM jsonb_array_elements(tasks) AS elem
        WHERE (elem->>'is_read')::boolean = false
      )
      WHERE user_id = $1
        AND digest_date = CURRENT_DATE
      RETURNING unread_count
    `,
      [userId],
    );

    const unreadCount = Number(countResult.rows[0]?.unread_count ?? 0);

    await client.query("COMMIT");

    return { tasks, unread_count: unreadCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const markAllAsRead = async (userId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE daily_task_digests
      SET
        tasks = (
          SELECT COALESCE(
            jsonb_agg(elem || '{"is_read": true}'::jsonb),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(tasks) AS elem
        ),
        unread_count = 0,
        updated_at   = NOW()
      WHERE user_id = $1
        AND digest_date = CURRENT_DATE
      RETURNING tasks, unread_count
    `,
      [userId],
    );

    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return { tasks: [], unread_count: 0 };
    }

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const generateDigestForAllUsers = async () => {
  // 1. Lấy tất cả user active
  const users = await pool.query(`SELECT id FROM users WHERE is_active = true`);

  let count = 0;

  for (const user of users.rows) {
    // 2. Query tasks due hôm nay của user này
    const result = await pool.query(
      `
      SELECT
        at.id          AS task_id,
        at.title,
        at.status,
        at.due_date,
        a.id           AS activity_id,
        a.name         AS activity_name,
        a.location
      FROM activity_tasks at
      JOIN task_assignees ta ON ta.task_id = at.id
      JOIN activities a ON a.id = at.activity_id
      WHERE
        at.status IN ('pending', 'in_progress')
        AND at.due_date::date = CURRENT_DATE
        AND ta.user_id = $1
    `,
      [user.id],
    );

    if (result.rows.length === 0) continue;

    // 3. Build tasks array
    const tasks = result.rows.map((row) => ({
      task_id: row.task_id,
      title: row.title,
      activity_id: row.activity_id,
      activity_name: row.activity_name,
      location: row.location,
      due_date: new Date(row.due_date).toISOString().split("T")[0],
      status: row.status,
    }));

    const body = `Bạn có ${tasks.length} nhiệm vụ trong ngày hôm nay.`;
    const metadata = { tasks };

    const existing = await pool.query(
      `
      SELECT id
      FROM notifications
      WHERE user_id = $1
        AND type = 'daily_digest'
        AND created_at::date = CURRENT_DATE
      LIMIT 1
    `,
      [user.id],
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `
        INSERT INTO notifications (user_id, type, title, body, metadata)
        VALUES ($1, 'daily_digest', $2, $3, $4::jsonb)
      `,
        [
          user.id,
          "📋 Nhiệm vụ hôm nay của bạn",
          body,
          JSON.stringify(metadata),
        ],
      );
    } else {
      await pool.query(
        `
        UPDATE notifications
        SET metadata = $1::jsonb,
            body = $2,
            is_read = FALSE,
            updated_at = NOW()
        WHERE user_id = $3
          AND type = 'daily_digest'
          AND created_at::date = CURRENT_DATE
      `,
        [JSON.stringify(metadata), body, user.id],
      );
    }

    count++;
  }

  console.log(`[Digest] Generated for ${count} users`);
  return count;
};

const checkDeadlineReminders = async () => {
  const now = new Date();

  // --- 6h REMINDER: nhắc người thực hiện ---
  const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const tasks6h = await pool.query(
    `
    SELECT
      atk.id        AS task_id,
      atk.title,
      atk.due_date,
      atk.activity_id,
      a.name        AS activity_name,
      a.location,
      ta.user_id
    FROM activity_tasks atk
    JOIN task_assignees ta ON ta.task_id = atk.id
    JOIN activities a ON a.id = atk.activity_id
    WHERE
      atk.status IN ('pending', 'in_progress')
      AND atk.reminded_6h = FALSE
      AND (atk.due_date AT TIME ZONE 'Asia/Ho_Chi_Minh' AT TIME ZONE 'UTC') <= $1
      AND (atk.due_date AT TIME ZONE 'Asia/Ho_Chi_Minh' AT TIME ZONE 'UTC') > $2
  `,
    [in6h.toISOString(), now.toISOString()],
  );

  for (const row of tasks6h.rows) {
    await pool.query(
      `
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES ($1, 'deadline_warning', $2, $3, $4::jsonb)
    `,
      [
        row.user_id,
        `⚠️ Sắp đến hạn: ${row.title}`,
        `Nhiệm vụ "${row.title}" còn khoảng 6 tiếng nữa là đến hạn.`,
        JSON.stringify({
          task_id: row.task_id,
          activity_id: row.activity_id,
          activity_name: row.activity_name,
          due_date: row.due_date,
          location: row.location,
        }),
      ],
    );
  }

  if (tasks6h.rows.length > 0) {
    const taskIds = [...new Set(tasks6h.rows.map((r) => r.task_id))];
    await pool.query(
      `
      UPDATE activity_tasks SET reminded_6h = TRUE
      WHERE id = ANY($1::int[])
    `,
      [taskIds],
    );
  }

  // --- 1h REMINDER: cảnh báo người chịu trách nhiệm (created_by) ---
  const in1h = new Date(now.getTime() + 1 * 60 * 60 * 1000);

  const tasks1h = await pool.query(
    `
    SELECT DISTINCT ON (atk.id)
      atk.id        AS task_id,
      atk.title,
      atk.due_date,
      atk.activity_id,
      a.name        AS activity_name,
      a.created_by  AS responsible_user_id,
      u.name        AS assignee_name
    FROM activity_tasks atk
    JOIN task_assignees ta ON ta.task_id = atk.id
    JOIN users u ON u.id = ta.user_id
    JOIN activities a ON a.id = atk.activity_id
    WHERE
      atk.status IN ('pending', 'in_progress')
      AND atk.reminded_1h = FALSE
      AND (atk.due_date AT TIME ZONE 'Asia/Ho_Chi_Minh' AT TIME ZONE 'UTC') <= $1
      AND (atk.due_date AT TIME ZONE 'Asia/Ho_Chi_Minh' AT TIME ZONE 'UTC') > $2
  `,
    [in1h.toISOString(), now.toISOString()],
  );

  console.log(tasks1h.rows, "tasks1h");

  for (const row of tasks1h.rows) {
    await pool.query(
      `
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES ($1, 'deadline_critical', $2, $3, $4::jsonb)
    `,
      [
        row.responsible_user_id,
        `🚨 Sắp trễ hạn: ${row.title}`,
        `Nhiệm vụ "${row.title}" của ${row.assignee_name} còn 1 tiếng là đến hạn, chưa hoàn thành.`,
        JSON.stringify({
          task_id: row.task_id,
          activity_id: row.activity_id,
          assignee_name: row.assignee_name,
          due_date: row.due_date,
        }),
      ],
    );
  }

  if (tasks1h.rows.length > 0) {
    const taskIds = tasks1h.rows.map((r) => r.task_id);
    await pool.query(
      `
      UPDATE activity_tasks SET reminded_1h = TRUE
      WHERE id = ANY($1::int[])
    `,
      [taskIds],
    );
  }

  console.log(tasks6h.rows, tasks1h.rows);
  console.log(
    `[DeadlineReminder] 6h: ${tasks6h.rows.length} | 1h: ${tasks1h.rows.length}`,
  );
};

module.exports = {
  getNotificationsByUser,
  markAsRead,
  getTodayDigest,
  markTaskAsRead,
  markAllAsRead,
  generateDigestForAllUsers,
  checkDeadlineReminders,
};

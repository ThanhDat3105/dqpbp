"use strict";

const pool = require("../config/db");

const formatDate = (value) => new Date(value).toISOString().split("T")[0];

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
  const today = new Date().toISOString().split("T")[0];

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
      due_date: row.due_date.toISOString().split("T")[0],
      status: row.status,
      is_read: false,
    }));

    // 4. Upsert
    await pool.query(
      `
      INSERT INTO daily_task_digests (user_id, digest_date, tasks, unread_count)
      VALUES ($1, $2, $3::jsonb, $4)
      ON CONFLICT (user_id, digest_date)
      DO UPDATE SET
        tasks        = EXCLUDED.tasks,
        unread_count = EXCLUDED.unread_count,
        updated_at   = NOW()
    `,
      [user.id, today, JSON.stringify(tasks), tasks.length],
    );

    count++;
  }

  console.log(`[Digest] Generated for ${count} users`);
  return count;
};

module.exports = {
  getTodayDigest,
  markTaskAsRead,
  markAllAsRead,
  generateDigestForAllUsers,
};

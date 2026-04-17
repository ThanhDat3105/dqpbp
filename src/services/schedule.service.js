"use strict";

const pool = require("../config/db");

function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const getWeeklySchedule = async (weekStart, user_id, unitFilter = null) => {
  // Normalize weekStart về Monday của tuần (ISO week starts on Monday)
  const inputDate = new Date(weekStart);
  const day = inputDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = day === 0 ? -6 : 1 - day; // Sun → lùi 6 ngày; các ngày khác → về Monday
  inputDate.setUTCDate(inputDate.getUTCDate() + diff);
  const normalizedWeekStart = inputDate.toISOString().split("T")[0];

  const currentUser = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [user_id]
  );

  if (currentUser.rowCount === 0) {
    throw new Error("User not found");
  }

  const { role, unit_code, managed_units } = currentUser.rows[0];

  const allowedRoles = ["CHI_HUY", "TO_TRUONG", "DQTT", "DQCD"];
  if (!allowedRoles.includes(role)) {
    throw new Error("Invalid role");
  }

  let memberFilter = "";
  let params = [normalizedWeekStart]; // $1 = normalizedWeekStart

  if (role === "CHI_HUY" || role === "TO_TRUONG") {
    const filterUnit = unitFilter === "all" ? null : unitFilter || "a1";

    if (filterUnit) {
      memberFilter = `WHERE role = 'DQCD' AND unit_code = $2`;
      params.push(filterUnit);
    } else {
      memberFilter = `WHERE role = 'DQCD'`;
    }
  } else if (role === "DQTT") {
    if (!managed_units || managed_units.length === 0) {
      return {
        week: {
          start: normalizedWeekStart,
          end: normalizedWeekStart,
          week_number: null,
        },
        members: [],
        total: 0,
        last_updated: new Date().toISOString(),
      };
    }

    memberFilter = `WHERE role = 'DQCD' AND unit_code = ANY($2)`;
    params.push(managed_units);
  } else if (role === "DQCD") {
    if (!unit_code) {
      return {
        week: {
          start: normalizedWeekStart,
          end: normalizedWeekStart,
          week_number: null,
        },
        members: [],
        total: 0,
        last_updated: new Date().toISOString(),
      };
    }

    memberFilter = `WHERE role = 'DQCD' AND unit_code = $2`;
    params.push(unit_code);
  }

  const query = `
    WITH members AS (
      SELECT id AS user_id, name
      FROM public.users
      ${memberFilter}
    ),
    week_days AS (
      SELECT generate_series(
        $1::date,
        $1::date + interval '6 days',
        interval '1 day'
      )::date AS slot_date
    ),
    days_with_dow AS (
      SELECT slot_date, EXTRACT(ISODOW FROM slot_date)::int AS day_of_week
      FROM week_days
    )
    SELECT
      m.user_id,
      m.name,
      d.day_of_week,
      t.shift,
      to_char(t.start_time, 'HH24:MI') AS start_time,
      to_char(t.end_time, 'HH24:MI') AS end_time,
      COALESCE(aw.mobilize_count, 0) AS mobilize_count
    FROM members m
    CROSS JOIN days_with_dow d
    LEFT JOIN LATERAL (
      SELECT shift, start_time, end_time
      FROM user_schedule_templates
      WHERE user_id = m.user_id
        AND day_of_week = d.day_of_week
        AND (week_start = $1::date OR week_start IS NULL)
      ORDER BY week_start NULLS LAST  -- tuần cụ thể ưu tiên hơn NULL (default template)
      LIMIT 1
    ) t ON true
    LEFT JOIN availability_weeks aw
      ON aw.user_id = m.user_id
      AND aw.week_start::date = $1::date
    ORDER BY m.name, d.day_of_week, t.shift;
  `;

  const { rows } = await pool.query(query, params);

  const membersMap = new Map();

  rows.forEach((row) => {
    if (!membersMap.has(row.user_id)) {
      membersMap.set(row.user_id, {
        user_id: row.user_id,
        name: row.name,
        mobilize_count: row.mobilize_count,
        schedule: {
          1: { SANG: null, CHIEU: null, DEM: null },
          2: { SANG: null, CHIEU: null, DEM: null },
          3: { SANG: null, CHIEU: null, DEM: null },
          4: { SANG: null, CHIEU: null, DEM: null },
          5: { SANG: null, CHIEU: null, DEM: null },
          6: { SANG: null, CHIEU: null, DEM: null },
          7: { SANG: null, CHIEU: null, DEM: null },
        },
      });
    }

    if (row.shift) {
      const member = membersMap.get(row.user_id);
      member.schedule[row.day_of_week][row.shift] = row.start_time
        ? { start: row.start_time, end: row.end_time }
        : null;
    }
  });

  const members = Array.from(membersMap.values());

  const startDate = new Date(normalizedWeekStart);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);

  return {
    week: {
      start: normalizedWeekStart,
      end: endDate.toISOString().split("T")[0],
      week_number: getISOWeekNumber(startDate),
    },
    members,
    total: members.length,
    last_updated: new Date().toISOString(),
  };
};

const upsertTemplate = async (data) => {
  const query = `
    INSERT INTO user_schedule_templates
    (user_id, day_of_week, shift, start_time, end_time, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, day_of_week, shift)
    DO UPDATE SET
      start_time = EXCLUDED.start_time,
      end_time   = EXCLUDED.end_time,
      note       = EXCLUDED.note,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    data.user_id,
    data.day_of_week,
    data.shift,
    data.start_time,
    data.end_time,
    data.note || null
  ]);
  return rows[0];
};

const deleteTemplate = async (data) => {
  const query = `
    DELETE FROM user_schedule_templates
    WHERE user_id = $1 AND day_of_week = $2 AND shift = $3
  `;
  await pool.query(query, [data.user_id, data.day_of_week, data.shift]);
};

const updateMobilize = async (data) => {
  const query = `
    INSERT INTO availability_weeks (user_id, week_start, mobilize_count)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET
      mobilize_count = EXCLUDED.mobilize_count,
      updated_at     = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    data.user_id,
    data.week_start,
    data.mobilize_count
  ]);
  return rows[0];
};

const checkUserExists = async (userId) => {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
  return rows.length > 0;
};

const registerSchedule = async (userId, weekStart, schedules) => {
  const today = new Date();
  const day = today.getDay()

  if (day === 0 || day === 6) {
    throw new Error(
      "Hôm nay là Thứ 7 hoặc Chủ nhật. Chỉ được phép đăng ký từ Thứ 2 đến Thứ 6."
    );
  }

  const savedResults = [];

  for (const item of schedules) {
    const query = `
        INSERT INTO user_schedule_templates (user_id, week_start, day_of_week, shift, start_time, end_time, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, week_start, day_of_week, shift) 
        DO UPDATE SET
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

    const { rows } = await pool.query(query, [
      userId,
      weekStart,
      item.day_of_week,
      item.shift,
      item.start_time,
      item.end_time,
      item.note
    ]);

    savedResults.push(rows[0]);
  }

  return savedResults;
};

module.exports = {
  getWeeklySchedule,
  upsertTemplate,
  deleteTemplate,
  updateMobilize,
  checkUserExists,
  registerSchedule
};

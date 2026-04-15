const db = require('../config/db');

const formatRow = (r) => ({
  date: r.date ? new Date(r.date.getTime() - r.date.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : r.date,
  commander: r.commander,
  duty_officer: r.duty_officer,
  document_officer: r.document_officer,
  internal_affairs: r.internal_affairs,
  meal_duty: r.meal_duty,
  dqtt_leader: r.dqtt_leader,
  dqcd_patrol: r.dqcd_patrol ?? [],
  office_duties: r.office_duties ?? {},
  office_columns: r.office_columns ?? [],
});

const getWeek = async () => {
  const { rows } = await db.query(
    `SELECT * FROM schedule_days ORDER BY id`
  );

  if (!rows) {
    return {
      officeColumns: [],
      rows: [],
    };
  }

  return {
    officeColumns: rows[0].office_columns ?? [],
    rows: rows.map(formatRow),
  };
};

const upsertWeek = async (rows, officeColumns, userId) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      await client.query(
        `INSERT INTO schedule_days
           (date, commander, duty_officer, document_officer,
            internal_affairs, meal_duty, dqtt_leader,
            dqcd_patrol, office_duties, office_columns,
            created_by, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (date) DO UPDATE SET
           commander        = EXCLUDED.commander,
           duty_officer     = EXCLUDED.duty_officer,
           document_officer = EXCLUDED.document_officer,
           internal_affairs = EXCLUDED.internal_affairs,
           meal_duty        = EXCLUDED.meal_duty,
           dqtt_leader      = EXCLUDED.dqtt_leader,
           dqcd_patrol      = EXCLUDED.dqcd_patrol,
           office_duties    = EXCLUDED.office_duties,
           office_columns   = EXCLUDED.office_columns,
           updated_at       = NOW()`,
        [
          row.date,
          row.commander ?? null,
          row.duty_officer ?? null,
          row.document_officer ?? null,
          row.internal_affairs ?? null,
          row.meal_duty ?? null,
          row.dqtt_leader ?? null,
          row.dqcd_patrol ?? [],
          JSON.stringify(row.office_duties ?? {}),
          JSON.stringify(officeColumns),
          userId ?? null,
        ]
      );
    }
    await client.query('COMMIT');
    return { success: true, saved: rows.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { getWeek, upsertWeek };

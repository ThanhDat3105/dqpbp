// services/scheduleService.js
const db = require("../config/db");

const DEFAULT_OFFICE_COLUMNS = [
  {
    code: "hdnd_ubnd",
    label: "Trực trụ sở HĐND-UBND",
  },
  {
    code: "du",
    label: "Đảng uỷ",
  },
  {
    code: "pktht",
    label: "Phòng kinh tế hạ tầng",
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

const formatRow = (r) => ({
  date: r.date
    ? new Date(r.date.getTime() - r.date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)
    : r.date,
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

// Tính Monday và Sunday của tuần chứa dateInput
// dateInput: ISO string 'YYYY-MM-DD' hoặc undefined (= tuần hiện tại)
const getWeekRange = (dateInput) => {
  const base = dateInput ? new Date(dateInput) : new Date();
  const day = base.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
};

// ─── 1. GET lịch theo tuần ────────────────────────────────────────────────────

// Truyền date bất kỳ trong tuần → trả về 7 ngày T2–CN
// Không truyền → tuần hiện tại
const getWeekByDate = async (dateInput) => {
  const { weekStart, weekEnd } = getWeekRange(dateInput);

  const { rows } = await db.query(
    `SELECT * FROM schedule_days
     WHERE date >= $1 AND date <= $2
     ORDER BY date`,
    [weekStart, weekEnd],
  );

  return {
    weekStart,
    weekEnd,
    officeColumns: rows[0]?.office_columns ?? [],
    rows: rows.map(formatRow),
  };
};

// ─── 2. TẠO lịch cả tuần (7 ngày blank) ─────────────────────────────────────

// target: 'current' | 'next' | 'YYYY-MM-DD' (ngày bất kỳ trong tuần cần tạo)
// Chỉ INSERT ngày chưa tồn tại, không overwrite data đã có
const createWeek = async (target = "next", userId) => {
  const base = new Date();

  let referenceDate;
  if (target === "current") {
    referenceDate = base.toISOString().slice(0, 10);
  } else if (target === "next") {
    const next = new Date(base);
    next.setDate(base.getDate() + 7);
    referenceDate = next.toISOString().slice(0, 10);
  } else {
    referenceDate = target;
  }

  const { weekStart, weekEnd } = getWeekRange(referenceDate);

  // Generate T2 → CN
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    let created = 0;
    let skipped = 0;

    for (const date of dates) {
      const result = await client.query(
        `INSERT INTO schedule_days (date, office_columns, created_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (date) DO NOTHING`,
        [date, JSON.stringify(DEFAULT_OFFICE_COLUMNS), userId ?? null],
      );
      result.rowCount > 0 ? created++ : skipped++;
    }

    await client.query("COMMIT");
    return { success: true, weekStart, weekEnd, created, skipped, dates };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── 3. UPDATE lịch theo từng ngày ───────────────────────────────────────────

// date: 'YYYY-MM-DD' (bắt buộc)
// Chỉ UPDATE, không tạo mới — row phải tồn tại trước (tạo bằng createWeek)
const updateDay = async (date, payload, userId) => {
  const {
    commander,
    duty_officer,
    document_officer,
    internal_affairs,
    meal_duty,
    dqtt_leader,
    dqcd_patrol,
    office_duties,
  } = payload;

  const { rows } = await db.query(
    `UPDATE schedule_days SET
       commander        = COALESCE($2, commander),
       duty_officer     = COALESCE($3, duty_officer),
       document_officer = COALESCE($4, document_officer),
       internal_affairs = COALESCE($5, internal_affairs),
       meal_duty        = COALESCE($6, meal_duty),
       dqtt_leader      = COALESCE($7, dqtt_leader),
       dqcd_patrol      = COALESCE($8, dqcd_patrol),
       office_duties    = COALESCE($9, office_duties),
       updated_at       = NOW()
     WHERE date = $1
     RETURNING *`,
    [
      date,
      commander ?? null,
      duty_officer ?? null,
      document_officer ?? null,
      internal_affairs ?? null,
      meal_duty ?? null,
      dqtt_leader ?? null,
      dqcd_patrol ? dqcd_patrol : null,
      office_duties ? JSON.stringify(office_duties) : null,
    ],
  );

  if (rows.length === 0) {
    throw new Error(`Không tìm thấy lịch ngày ${date}. Hãy tạo tuần trước.`);
  }

  return { success: true, row: formatRow(rows[0]) };
};

module.exports = { getWeekByDate, createWeek, updateDay };

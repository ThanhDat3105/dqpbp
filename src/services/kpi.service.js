"use strict";

const {
  endOfISOWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfISOWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} = require("date-fns");

const db = require("../config/db");
const { BadRequestError } = require("../core/error.response");
const userService = require("./user.service");

const DEFAULT_TARGET_ROLES = ["DQTT", "DQCD"];

const normalizeRoles = (role) => {
  if (!role) {
    return DEFAULT_TARGET_ROLES;
  }

  const requestedRoles = Array.isArray(role)
    ? role
    : String(role)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const filteredRoles = requestedRoles.filter((item) =>
    DEFAULT_TARGET_ROLES.includes(item),
  );

  if (filteredRoles.length === 0) {
    throw new BadRequestError("role must be DQTT and/or DQCD");
  }

  return [...new Set(filteredRoles)];
};

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const parseYear = (year) => {
  if (!hasValue(year)) {
    return new Date().getFullYear();
  }

  const yearValue = Number(year);

  if (!Number.isInteger(yearValue) || yearValue < 1) {
    throw new BadRequestError("year must be a valid integer");
  }

  return yearValue;
};

const parseWeek = (week) => {
  const weekValue = Number(week);

  if (!Number.isInteger(weekValue) || weekValue < 1 || weekValue > 53) {
    throw new BadRequestError("week must be an integer between 1 and 53");
  }

  return weekValue;
};

const getISOWeekStartDate = (year, week) => {
  const simple = new Date(Date.UTC(year, 0, 4));
  const day = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() - day + 1 + (week - 1) * 7);
  return new Date(simple.getUTCFullYear(), simple.getUTCMonth(), simple.getUTCDate());
};

const getRangeByPeriod = (period) => {
  const now = new Date();

  switch (period) {
    case "week":
      return {
        from: format(startOfISOWeek(now), "yyyy-MM-dd"),
        to: format(endOfISOWeek(now), "yyyy-MM-dd"),
      };
    case "quarter":
      return {
        from: format(startOfQuarter(now), "yyyy-MM-dd"),
        to: format(endOfQuarter(now), "yyyy-MM-dd"),
      };
    case "year":
      return {
        from: format(startOfYear(now), "yyyy-MM-dd"),
        to: format(endOfYear(now), "yyyy-MM-dd"),
      };
    case "month":
    default:
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
};

const resolveSummaryRange = ({ period, from, to, week, month, quarter, year }) => {
  if (hasValue(from) || hasValue(to)) {
    if (!hasValue(from) || !hasValue(to)) {
      throw new BadRequestError("Both from and to are required together");
    }

    const fromDate = parseISO(from);
    const toDate = parseISO(to);

    if (!isValid(fromDate) || !isValid(toDate)) {
      throw new BadRequestError("from/to must be valid ISO dates (yyyy-MM-dd)");
    }

    if (fromDate > toDate) {
      throw new BadRequestError("from must be earlier than or equal to to");
    }

    return {
      from: format(fromDate, "yyyy-MM-dd"),
      to: format(toDate, "yyyy-MM-dd"),
    };
  }

  const granularFilters = [week, month, quarter].filter(hasValue);

  if (granularFilters.length > 1) {
    throw new BadRequestError("week, month and quarter cannot be used together");
  }

  if (hasValue(week)) {
    const weekDate = getISOWeekStartDate(parseYear(year), parseWeek(week));

    return {
      from: format(startOfISOWeek(weekDate), "yyyy-MM-dd"),
      to: format(endOfISOWeek(weekDate), "yyyy-MM-dd"),
    };
  }

  if (hasValue(month)) {
    const monthValue = Number(month);

    if (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12) {
      throw new BadRequestError("month must be an integer between 1 and 12");
    }

    const monthDate = new Date(parseYear(year), monthValue - 1, 1);

    return {
      from: format(startOfMonth(monthDate), "yyyy-MM-dd"),
      to: format(endOfMonth(monthDate), "yyyy-MM-dd"),
    };
  }

  if (hasValue(quarter)) {
    const quarterValue = Number(quarter);

    if (!Number.isInteger(quarterValue) || quarterValue < 1 || quarterValue > 4) {
      throw new BadRequestError("quarter must be an integer between 1 and 4");
    }

    const quarterDate = new Date(parseYear(year), (quarterValue - 1) * 3, 1);

    return {
      from: format(startOfQuarter(quarterDate), "yyyy-MM-dd"),
      to: format(endOfQuarter(quarterDate), "yyyy-MM-dd"),
    };
  }

  if (hasValue(year)) {
    const yearDate = new Date(parseYear(year), 0, 1);

    return {
      from: format(startOfYear(yearDate), "yyyy-MM-dd"),
      to: format(endOfYear(yearDate), "yyyy-MM-dd"),
    };
  }

  const normalizedPeriod = (period || "month").toLowerCase();
  const validPeriods = ["month", "week", "quarter", "year"];

  if (!validPeriods.includes(normalizedPeriod)) {
    throw new BadRequestError("period must be one of: month, week, quarter, year");
  }

  return getRangeByPeriod(normalizedPeriod);
};

const getKpiData = async ({
  from,
  to,
  role,
  user_id,
  requesterId,
  requesterRole,
}) => {
  const targetRoles = normalizeRoles(role);

  // DQCD can only see their own KPI even when user_id is omitted.
  const effectiveUserId =
    requesterRole === "DQCD" ? requesterId : user_id ?? null;

  const values = [targetRoles, from, to];
  const whereClauses = [
    "ta.role = ANY($1)",
    "t.due_date::date BETWEEN $2::date AND $3::date",
  ];

  if (effectiveUserId) {
    values.push(effectiveUserId);
    whereClauses.push(`ta.user_id = $${values.length}`);
  }

  const query = `
    SELECT
      u.id AS user_id,
      u.name,
      u.role,
      COUNT(*) FILTER (WHERE t.status != 'cancelled') AS total_assigned,
      COUNT(*) FILTER (WHERE t.status = 'completed') AS completed,
      COUNT(*) FILTER (
        WHERE t.status = 'completed'
        AND t.completed_at IS NOT NULL
        AND t.completed_at <= t.due_date
      ) AS on_time,
      COUNT(*) FILTER (WHERE t.status = 'cancelled') AS cancelled
    FROM users u
    JOIN task_assignees ta ON ta.user_id = u.id
    JOIN activity_tasks t ON t.id = ta.task_id
    WHERE ${whereClauses.join(" AND ")}
    GROUP BY u.id, u.name, u.role
    ORDER BY completed DESC;
  `;

  const { rows } = await db.query(query, values);

  return rows.map((row) => {
    const totalAssigned = Number(row.total_assigned) || 0;
    const completed = Number(row.completed) || 0;
    const onTime = Number(row.on_time) || 0;
    const cancelled = Number(row.cancelled) || 0;

    const completionRate =
      totalAssigned > 0 ? Number(((completed * 100) / totalAssigned).toFixed(2)) : 0;
    const onTimeRate =
      completed > 0 ? Number(((onTime * 100) / completed).toFixed(2)) : 0;

    return {
      user_id: row.user_id,
      name: row.name,
      role: row.role,
      total_assigned: totalAssigned,
      completed,
      on_time: onTime,
      cancelled,
      completion_rate: completionRate,
      on_time_rate: onTimeRate,
    };
  });
};

const getKpiSummary = async ({
  period,
  from,
  to,
  week,
  month,
  quarter,
  year,
  role,
  user_id,
  requesterId,
  requesterRole,
}) => {
  const targetRoles = normalizeRoles(role);
  const dateRange = resolveSummaryRange({
    period,
    from,
    to,
    week,
    month,
    quarter,
    year,
  });

  const effectiveUserId =
    requesterRole === "DQCD" ? requesterId : user_id ?? null;

  const values = [targetRoles, dateRange.from, dateRange.to];
  const whereClauses = [
    "ta.role = ANY($1)",
    "t.due_date::date BETWEEN $2::date AND $3::date",
  ];

  if (effectiveUserId) {
    values.push(effectiveUserId);
    whereClauses.push(`ta.user_id = $${values.length}`);
  }

  const query = `
    SELECT
      COUNT(*) FILTER (WHERE t.status != 'cancelled') AS total_assigned,
      COUNT(*) FILTER (WHERE t.status = 'completed') AS completed,
      COUNT(*) FILTER (
        WHERE t.status = 'completed'
        AND t.completed_at IS NOT NULL
        AND t.completed_at <= t.due_date
      ) AS completed_on_time,
      COUNT(*) FILTER (
        WHERE t.status = 'completed'
        AND t.completed_at IS NOT NULL
        AND t.completed_at > t.due_date
      ) AS completed_late,
      COUNT(*) FILTER (
        WHERE t.status IN ('pending', 'in_progress')
      ) AS not_completed,
      COUNT(*) FILTER (
        WHERE t.status IN ('pending', 'in_progress')
        AND t.due_date::date < CURRENT_DATE
      ) AS overdue,
      COUNT(*) FILTER (WHERE t.status = 'cancelled') AS cancelled
    FROM task_assignees ta
    JOIN activity_tasks t ON t.id = ta.task_id
    WHERE ${whereClauses.join(" AND ")};
  `;

  const { rows } = await db.query(query, values);
  const row = rows[0] || {};

  return {
    total_assigned: Number(row.total_assigned) || 0,
    completed: Number(row.completed) || 0,
    completed_on_time: Number(row.completed_on_time) || 0,
    completed_late: Number(row.completed_late) || 0,
    not_completed: Number(row.not_completed) || 0,
    overdue: Number(row.overdue) || 0,
    cancelled: Number(row.cancelled) || 0,
  };
};

const KPI_STATUS_CASE = `
  CASE
    WHEN status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at::date < due_date::date
      THEN 'exceeded'
    WHEN status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at::date <= due_date::date
      THEN 'achieved'
    WHEN status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at::date > due_date::date
      THEN 'failed'
    WHEN status IN ('pending', 'in_progress')
      AND due_date::date < CURRENT_DATE
      THEN 'failed'
    WHEN status IN ('pending', 'in_progress')
      AND due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
      THEN 'warning'
    WHEN status IN ('pending', 'in_progress')
      THEN 'in_progress'
    ELSE 'in_progress'
  END
`;

const summarizeStatusRows = (rows) => {
  const summary = {
    total: 0,
    exceeded: 0,
    achieved: 0,
    warning: 0,
    failed: 0,
    in_progress: 0,
  };

  rows.forEach((row) => {
    const count = Number(row.count) || 0;
    summary.total += count;

    if (summary[row.kpi_status] !== undefined) {
      summary[row.kpi_status] += count;
    }
  });

  return summary;
};

const getKpiDepartments = async ({
  period,
  from,
  to,
  week,
  month,
  quarter,
  year,
  department_id,
  role,
  requesterId,
  requesterRole,
  requesterDepartmentId,
}) => {
  const targetRoles = normalizeRoles(role);
  const dateRange = resolveSummaryRange({
    period,
    from,
    to,
    week,
    month,
    quarter,
    year,
  });

  const values = [targetRoles, dateRange.from, dateRange.to];
  const userClauses = [
    "u.is_active = true",
    "u.role = ANY($1)",
    "t.due_date::date BETWEEN $2::date AND $3::date",
    "t.status != 'cancelled'",
  ];

  if (requesterRole === "DQCD") {
    values.push(requesterId);
    userClauses.push(`u.id = $${values.length}`);
  }

  if (department_id) {
    values.push(department_id);
    userClauses.push(`u.department_id = $${values.length}`);
  }

  if (requesterRole === "TO_TRUONG" && requesterDepartmentId) {
    values.push(requesterDepartmentId);
    userClauses.push(`u.department_id = $${values.length}`);
  }

  const departmentValues = [];
  const departmentClauses = ["1=1"];

  if (department_id) {
    departmentValues.push(department_id);
    departmentClauses.push(`d.id = $${departmentValues.length}`);
  }

  if (
    (requesterRole === "TO_TRUONG" || requesterRole === "DQCD") &&
    requesterDepartmentId
  ) {
    departmentValues.push(requesterDepartmentId);
    departmentClauses.push(`d.id = $${departmentValues.length}`);
  }

  const scopedTasksCte = `
    WITH scoped_tasks AS (
      SELECT DISTINCT
        t.id,
        t.status,
        t.completed_at,
        t.due_date,
        COALESCE(a.work_type, 'other') AS work_type,
        u.department_id,
        d.code AS department_code,
        d.name AS department_name
      FROM activity_tasks t
      JOIN activities a ON a.id = t.activity_id
      JOIN task_assignees ta ON ta.task_id = t.id
      JOIN users u ON u.id = ta.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE ${userClauses.join(" AND ")}
    )
  `;

  const [
    overviewResult,
    groupsResult,
    departmentsResult,
    baseDepartmentsResult,
  ] = await Promise.all([
    db.query(
      `${scopedTasksCte}
       SELECT kpi_status, COUNT(*) AS count
       FROM (
         SELECT DISTINCT id, ${KPI_STATUS_CASE} AS kpi_status
         FROM scoped_tasks
       ) scoped
       GROUP BY kpi_status`,
      values,
    ),
    db.query(
      `${scopedTasksCte}
       SELECT work_type, kpi_status, COUNT(*) AS count
       FROM (
         SELECT DISTINCT id, work_type, ${KPI_STATUS_CASE} AS kpi_status
         FROM scoped_tasks
       ) scoped
       GROUP BY work_type, kpi_status
       ORDER BY work_type ASC`,
      values,
    ),
    db.query(
      `${scopedTasksCte}
       SELECT department_id, department_code, department_name, kpi_status, COUNT(*) AS count
       FROM (
         SELECT DISTINCT id, department_id, department_code, department_name, ${KPI_STATUS_CASE} AS kpi_status
         FROM scoped_tasks
       ) scoped
       GROUP BY department_id, department_code, department_name, kpi_status
       ORDER BY department_name ASC NULLS LAST`,
      values,
    ),
    db.query(
      `SELECT
         d.id AS department_id,
         d.code AS department_code,
         d.name AS department_name
       FROM departments d
       WHERE ${departmentClauses.join(" AND ")}
       ORDER BY d.name ASC`,
      departmentValues,
    ),
  ]);

  const overview = summarizeStatusRows(overviewResult.rows);

  const groupsMap = new Map();
  groupsResult.rows.forEach((row) => {
    if (!groupsMap.has(row.work_type)) {
      groupsMap.set(row.work_type, {
        work_type: row.work_type,
        ...summarizeStatusRows([]),
      });
    }

    const item = groupsMap.get(row.work_type);
    const count = Number(row.count) || 0;
    item.total += count;
    item[row.kpi_status] = (item[row.kpi_status] || 0) + count;
  });

  const departmentsMap = new Map();
  baseDepartmentsResult.rows.forEach((row) => {
    departmentsMap.set(row.department_id, {
      department_id: row.department_id,
      department_code: row.department_code,
      department_name: row.department_name || "Chua xac dinh",
      ...summarizeStatusRows([]),
    });
  });

  departmentsResult.rows.forEach((row) => {
    const key = row.department_id ?? "unknown";

    if (!departmentsMap.has(key)) {
      departmentsMap.set(key, {
        department_id: row.department_id,
        department_code: row.department_code,
        department_name: row.department_name || "Chua xac dinh",
        ...summarizeStatusRows([]),
      });
    }

    const item = departmentsMap.get(key);
    const count = Number(row.count) || 0;
    item.total += count;
    item[row.kpi_status] = (item[row.kpi_status] || 0) + count;
  });

  return {
    period: dateRange,
    overview,
    groups: Array.from(groupsMap.values()),
    departments: Array.from(departmentsMap.values()),
  };
};

const getKpiList = async (filters = {}) => {
  const users = await userService.getAll({
    ...filters,
    includeKpi: true,
  });

  return users;
};

module.exports = {
  getKpiData,
  getKpiDepartments,
  getKpiList,
  getKpiSummary,
};

"use strict";

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
    "u.role = ANY($1)",
    "t.due_date::date BETWEEN $2::date AND $3::date",
  ];

  if (effectiveUserId) {
    values.push(effectiveUserId);
    whereClauses.push(`u.id = $${values.length}`);
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

const getKpiList = async (filters = {}) => {
  const users = await userService.getAll({
    ...filters,
    includeKpi: true,
  });

  return users;
};

module.exports = {
  getKpiData,
  getKpiList,
};

"use strict";

const { ForbiddenError } = require("../core/error.response");

const ROLES_WITH_FULL_TASK_VIEW = new Set(["ADMIN", "CHI_HUY"]);
const ROLES_WITH_TEAM_VIEW_FILTER = new Set(["TO_TRUONG", "DQTT", "DQCD"]);
const ROLES_WITH_TEAM_EXECUTE_CHECK = new Set(["DQTT", "DQCD"]);

const hasFullTaskViewAccess = (role) => ROLES_WITH_FULL_TASK_VIEW.has(role);

const requiresTeamFilterForView = (role) =>
  ROLES_WITH_TEAM_VIEW_FILTER.has(role);

const requiresTeamCheckForExecute = (role) =>
  ROLES_WITH_TEAM_EXECUTE_CHECK.has(role);

const userBelongsToTaskTeam = (userDepartment, taskTeam) => {
  if (!userDepartment || !Array.isArray(taskTeam) || taskTeam.length === 0) {
    return false;
  }

  return taskTeam.includes(userDepartment);
};

const getTeamFilterDepartment = (role, department) => {
  if (hasFullTaskViewAccess(role)) {
    return null;
  }

  if (requiresTeamFilterForView(role)) {
    return department ?? false;
  }

  return null;
};

const buildTaskTeamSqlFilter = (teamDepartment, paramIndex) => {
  if (teamDepartment === false) {
    return { clause: "AND FALSE", params: [] };
  }

  if (!teamDepartment) {
    return { clause: "", params: [] };
  }

  return {
    clause: `AND $${paramIndex}::TEXT = ANY(t.team)`,
    params: [teamDepartment],
  };
};

const assertCanExecuteTask = (user, task) => {
  if (!requiresTeamCheckForExecute(user?.role)) {
    return;
  }

  if (!userBelongsToTaskTeam(user?.department, task?.team)) {
    throw new ForbiddenError(
      "Bạn không có quyền thực hiện nhiệm vụ của tổ khác",
    );
  }
};

module.exports = {
  hasFullTaskViewAccess,
  requiresTeamFilterForView,
  requiresTeamCheckForExecute,
  userBelongsToTaskTeam,
  getTeamFilterDepartment,
  buildTaskTeamSqlFilter,
  assertCanExecuteTask,
};

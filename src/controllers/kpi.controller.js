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

const { BadRequestError, ForbiddenError } = require("../core/error.response");
const { SuccessResponse } = require("../core/success.response");
const kpiService = require("../services/kpi.service");

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

const parseDateRange = ({ period, from, to }) => {
  if ((from && !to) || (!from && to)) {
    throw new BadRequestError("Both from and to are required together");
  }

  if (from && to) {
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

  const normalizedPeriod = (period || "month").toLowerCase();
  const validPeriods = ["month", "week", "quarter", "year"];

  if (!validPeriods.includes(normalizedPeriod)) {
    throw new BadRequestError("period must be one of: month, week, quarter, year");
  }

  return getRangeByPeriod(normalizedPeriod);
};

const parseYear = (year) => {
  if (year === undefined || year === null || year === "") {
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

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const parseSummaryRange = ({ period, from, to, week, month, quarter, year }) => {
  if (hasValue(from) || hasValue(to)) {
    return parseDateRange({ period, from, to });
  }

  const granularFilters = [week, month, quarter].filter(hasValue);

  if (granularFilters.length > 1) {
    throw new BadRequestError("week, month and quarter cannot be used together");
  }

  if (hasValue(week)) {
    const weekValue = parseWeek(week);
    const yearValue = parseYear(year);
    const weekDate = getISOWeekStartDate(yearValue, weekValue);

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

    const yearValue = parseYear(year);
    const monthDate = new Date(yearValue, monthValue - 1, 1);

    if (!isValid(monthDate)) {
      throw new BadRequestError("month/year must form a valid date");
    }

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

    const yearValue = parseYear(year);
    const quarterDate = new Date(yearValue, (quarterValue - 1) * 3, 1);

    if (!isValid(quarterDate)) {
      throw new BadRequestError("quarter/year must form a valid date");
    }

    return {
      from: format(startOfQuarter(quarterDate), "yyyy-MM-dd"),
      to: format(endOfQuarter(quarterDate), "yyyy-MM-dd"),
    };
  }

  if (hasValue(year)) {
    const yearValue = parseYear(year);
    const yearDate = new Date(yearValue, 0, 1);

    if (!isValid(yearDate)) {
      throw new BadRequestError("year must form a valid date");
    }

    return {
      from: format(startOfYear(yearDate), "yyyy-MM-dd"),
      to: format(endOfYear(yearDate), "yyyy-MM-dd"),
    };
  }

  return parseDateRange({ period, from, to });
};

const getKpi = async (req, res, next) => {
  try {
    const { period, from, to, role, user_id } = req.query;

    const requesterId = req.user?.id ?? req.user?.user_id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      throw new ForbiddenError("Authentication required");
    }

    if (
      requesterRole === "DQCD" &&
      user_id !== undefined &&
      String(user_id) !== String(requesterId)
    ) {
      throw new ForbiddenError("DQCD can only view own KPI");
    }

    const dateRange = parseDateRange({ period, from, to });

    const data = await kpiService.getKpiData({
      from: dateRange.from,
      to: dateRange.to,
      role,
      user_id,
      requesterId,
      requesterRole,
    });

    return new SuccessResponse({
      message: "KPI data retrieved successfully",
      metaData: {
        period: dateRange,
        data,
      },
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const getKpiSummary = async (req, res, next) => {
  try {
    const { period, from, to, role, user_id, week, month, quarter, year } = req.query;

    const requesterId = req.user?.id ?? req.user?.user_id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      throw new ForbiddenError("Authentication required");
    }

    // const allowedRoles = ["DQTT", "DQCD"];
    // if (!allowedRoles.includes(requesterRole)) {
    //   throw new ForbiddenError("Only DQTT/DQCD can access KPI summary");
    // }

    if (
      requesterRole === "DQCD" &&
      user_id !== undefined &&
      String(user_id) !== String(requesterId)
    ) {
      throw new ForbiddenError("DQCD can only view own KPI");
    }

    const dateRange = parseSummaryRange({
      period,
      from,
      to,
      week,
      month,
      quarter,
      year,
    });

    const summary = await kpiService.getKpiSummary({
      period,
      from: dateRange.from,
      to: dateRange.to,
      week,
      month,
      quarter,
      year,
      role,
      user_id,
      requesterId,
      requesterRole,
    });

    return new SuccessResponse({
      message: "KPI summary retrieved successfully",
      metaData: {
        period: dateRange,
        summary,
      },
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

const getKpiDepartments = async (req, res, next) => {
  try {
    const {
      period,
      from,
      to,
      week,
      month,
      quarter,
      year,
      role,
      department_id,
      departmentId,
    } = req.query;

    const requesterId = req.user?.id ?? req.user?.user_id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      throw new ForbiddenError("Authentication required");
    }

    const data = await kpiService.getKpiDepartments({
      period,
      from,
      to,
      week,
      month,
      quarter,
      year,
      role,
      department_id: department_id ?? departmentId,
      requesterId,
      requesterRole,
      requesterDepartmentId: req.user?.department_id,
    });

    return new SuccessResponse({
      message: "KPI by departments retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getKpi,
  getKpiDepartments,
  getKpiSummary,
};

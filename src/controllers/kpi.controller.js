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

const parseSummaryRange = ({ period, from, to, month, year }) => {
  if (month !== undefined && month !== null && month !== "") {
    const monthValue = Number(month);

    if (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12) {
      throw new BadRequestError("month must be an integer between 1 and 12");
    }

    const now = new Date();
    const yearValue =
      year === undefined || year === null || year === ""
        ? now.getFullYear()
        : Number(year);

    if (!Number.isInteger(yearValue)) {
      throw new BadRequestError("year must be a valid integer");
    }

    const monthDate = new Date(yearValue, monthValue - 1, 1);

    if (!isValid(monthDate)) {
      throw new BadRequestError("month/year must form a valid date");
    }

    return {
      from: format(startOfMonth(monthDate), "yyyy-MM-dd"),
      to: format(endOfMonth(monthDate), "yyyy-MM-dd"),
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
    const { period, from, to, role, user_id, month, year } = req.query;

    const requesterId = req.user?.id ?? req.user?.user_id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      throw new ForbiddenError("Authentication required");
    }

    const allowedRoles = ["DQTT", "DQCD"];
    if (!allowedRoles.includes(requesterRole)) {
      throw new ForbiddenError("Only DQTT/DQCD can access KPI summary");
    }

    if (
      requesterRole === "DQCD" &&
      user_id !== undefined &&
      String(user_id) !== String(requesterId)
    ) {
      throw new ForbiddenError("DQCD can only view own KPI");
    }

    const dateRange = parseSummaryRange({ period, from, to, month, year });

    const summary = await kpiService.getKpiSummary({
      from: dateRange.from,
      to: dateRange.to,
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

module.exports = {
  getKpi,
  getKpiSummary,
};

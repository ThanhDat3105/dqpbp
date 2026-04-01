"use strict";

const moment = require("moment");

const DATE_FORMAT = "YYYY-MM-DD";
const SUPPORTED_CALENDAR_VIEWS = ["day", "week", "month"];

const parseISODate = (dateStr) => {
  const parsed = moment(dateStr, DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
};

const getCalendarDateRange = (view, dateStr) => {
  const normalizedView = String(view || "").toLowerCase();
  const parsedDate = parseISODate(dateStr);

  if (!SUPPORTED_CALENDAR_VIEWS.includes(normalizedView) || !parsedDate) {
    return null;
  }

  let startDateMoment;
  let endDateMoment;

  switch (normalizedView) {
    case "day":
      startDateMoment = parsedDate.clone().startOf("day");
      endDateMoment = parsedDate.clone().endOf("day");
      break;
    case "week":
      startDateMoment = parsedDate.clone().startOf("isoWeek").startOf("day");
      endDateMoment = parsedDate.clone().endOf("isoWeek").endOf("day");
      break;
    case "month":
      startDateMoment = parsedDate.clone().startOf("month").startOf("day");
      endDateMoment = parsedDate.clone().endOf("month").endOf("day");
      break;
    default:
      return null;
  }

  return {
    view: normalizedView,
    startDate: startDateMoment.format("YYYY-MM-DD HH:mm:ss"),
    endDate: endDateMoment.format("YYYY-MM-DD HH:mm:ss"),
  };
};

const buildPrefilledDateMap = (startDate, endDate) => {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);

  if (!start || !end || start.isAfter(end, "day")) {
    return {};
  }

  const dateMap = {};
  const cursor = start.clone();

  while (cursor.isSameOrBefore(end, "day")) {
    dateMap[cursor.format(DATE_FORMAT)] = [];
    cursor.add(1, "day");
  }

  return dateMap;
};

module.exports = {
  DATE_FORMAT,
  SUPPORTED_CALENDAR_VIEWS,
  getCalendarDateRange,
  buildPrefilledDateMap,
};

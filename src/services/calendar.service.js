const pool = require("../config/db");
const moment = require("moment");
const { BadRequestError } = require("../core/error.response");
const {
  DATE_FORMAT,
  getCalendarDateRange,
  buildPrefilledDateMap,
} = require("../utils/calendar-date.util");

class CalendarService {
  async getCalendarData({ view, date, user }) {
    const range = getCalendarDateRange(view, date);

    if (!range) {
      throw new BadRequestError(
        "Invalid query. view must be one of day|week|month and date must be YYYY-MM-DD",
      );
    }

    const isCommander = user?.role === "COMMANDER";
    const values = [range.startDate, range.endDate];

    const teamFilterClause = !isCommander ? "AND t.team = $3" : "";

    if (!isCommander) {
      values.push(user?.team || "");
    }

    const query = [
      "SELECT",
      "  t.id AS task_id,",
      "  t.title,",
      "  t.due_date,",
      "  t.status,",
      "  t.team,",
      "  t.activity_id,",
      "  a.name AS activity_name",
      "FROM activity_tasks t",
      "INNER JOIN activities a ON a.id = t.activity_id",
      "WHERE t.due_date BETWEEN $1 AND $2",
      teamFilterClause,
      "ORDER BY t.due_date ASC, t.id ASC",
    ]
      .filter(Boolean)
      .join("\n");

    const { rows } = await pool.query(query, values);
    const groupedData = buildPrefilledDateMap(range.startDate, range.endDate);

    if (!rows.length) {
      return groupedData;
    }

    const activityMapByDate = new Map();

    rows.forEach((row) => {
      const dateKey = moment(row.due_date).format('YYYY-MM-DD HH:mm:ss');

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = [];
      }

      if (!isCommander) {
        groupedData[dateKey].push({
          task_id: row.task_id,
          title: row.title,
          due_date: dateKey,
          status: row.status,
          activity_id: row.activity_id,
        });
        return;
      }

      if (!activityMapByDate.has(dateKey)) {
        activityMapByDate.set(dateKey, new Map());
      }

      const dateActivityMap = activityMapByDate.get(dateKey);
      let activityBucket = dateActivityMap.get(row.activity_id);

      if (!activityBucket) {
        activityBucket = {
          activity_id: row.activity_id,
          activity_name: row.activity_name,
          tasks: [],
        };

        dateActivityMap.set(row.activity_id, activityBucket);
        groupedData[dateKey].push(activityBucket);
      }

      activityBucket.tasks.push({
        task_id: row.task_id,
        title: row.title,
        due_date: dateKey,
        status: row.status,
        team: row.team,
      });
    });

    return groupedData;
  }
}

module.exports = new CalendarService();

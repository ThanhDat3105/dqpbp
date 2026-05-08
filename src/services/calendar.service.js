const pool = require("../config/db");
const moment = require("moment");
const { BadRequestError } = require("../core/error.response");
const {
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

    // Chỉ DQTT và DQCD mới bị lọc theo assignee
    const restrictedRoles = ["DQTT", "DQCD"];
    const isRestricted = restrictedRoles.includes(user?.role);

    const values = [range.startDate, range.endDate];

    const assigneeFilterClause = isRestricted
      ? "AND EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $3)"
      : "";

    if (isRestricted) {
      const userId = parseInt(user?.user_id);
      if (isNaN(userId)) {
        throw new BadRequestError("Invalid user id");
      }
      values.push(userId);
    }

    const isCommander = user?.role === "CHI_HUY" || user?.role === "TO_TRUONG";

    const query = [
      "SELECT",
      "  t.id AS task_id,",
      "  t.title,",
      "  t.due_date,",
      "  t.status,",
      "  t.team,",
      "  t.activity_id,",
      "  a.name AS activity_name,",
      "  a.start_date",
      "FROM activity_tasks t",
      "INNER JOIN activities a ON a.id = t.activity_id",
      "WHERE a.start_date <= $2 AND t.due_date >= $1",
      "AND t.status NOT IN ('canceled', 'completed')",
      assigneeFilterClause,
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
      const taskStart = moment.max(
        moment(row.start_date).startOf("day"),
        moment(range.startDate).startOf("day"),
      );
      const taskEnd = moment.min(
        moment(row.due_date).startOf("day"),
        moment(range.endDate).startOf("day"),
      );

      for (
        let day = taskStart.clone();
        day.isSameOrBefore(taskEnd);
        day.add(1, "day")
      ) {
        const dateKey = day.format("YYYY-MM-DD HH:mm:ss");

        if (!groupedData[dateKey]) {
          groupedData[dateKey] = [];
        }

        if (!isCommander) {
          const alreadyAdded = groupedData[dateKey].some(
            (t) => t.task_id === row.task_id,
          );
          if (!alreadyAdded) {
            groupedData[dateKey].push({
              task_id: row.task_id,
              title: row.title,
              due_date: moment(row.due_date).format("YYYY-MM-DD HH:mm:ss"),
              status: row.status,
              activity_id: row.activity_id,
              start_date: moment(row.start_date).format("YYYY-MM-DD HH:mm:ss"),
            });
          }
          continue;
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
            start_date: moment(row.start_date).format("YYYY-MM-DD HH:mm:ss"),
            tasks: [],
          };
          dateActivityMap.set(row.activity_id, activityBucket);
          groupedData[dateKey].push(activityBucket);
        }

        const alreadyAdded = activityBucket.tasks.some(
          (t) => t.task_id === row.task_id,
        );
        if (!alreadyAdded) {
          activityBucket.tasks.push({
            task_id: row.task_id,
            title: row.title,
            due_date: moment(row.due_date).format("YYYY-MM-DD HH:mm:ss"),
            status: row.status,
            team: row.team,
          });
        }
      }
    });

    return groupedData;
  }
}

module.exports = new CalendarService();

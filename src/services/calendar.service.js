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

    const isCommander = user?.role === "COMMANDER";
    const values = [range.startDate, range.endDate];

    const teamFilterClause = !isCommander ? "AND $3 = ANY(t.team)" : "";

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
      "  a.name AS activity_name,",
      "  a.start_date",                         // <-- thêm start_date từ activities
      "FROM activity_tasks t",
      "INNER JOIN activities a ON a.id = t.activity_id",
      // Task overlap với calendar range nếu: start_date <= range.endDate AND due_date >= range.startDate
      "WHERE a.start_date <= $2 AND t.due_date >= $1",
      "AND t.status NOT IN ('canceled', 'completed')",
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
      // Clamp: chỉ render trong khoảng calendar hiện tại
      const taskStart = moment.max(
        moment(row.start_date).startOf("day"),
        moment(range.startDate).startOf("day"),
      );
      const taskEnd = moment.min(
        moment(row.due_date).startOf("day"),
        moment(range.endDate).startOf("day"),
      );

      // Loop qua từng ngày trong khoảng [taskStart, taskEnd]
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
          // Non-commander: flat list, tránh duplicate cùng task_id trong 1 ngày
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
            });
          }
          continue;
        }

        // Commander: group by activity
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

        // Tránh duplicate task trong cùng 1 activity bucket của 1 ngày
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

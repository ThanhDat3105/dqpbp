const pool = require("../config/db");
const moment = require("moment");

class CalendarService {
  /**
   * Fetches the calendar data for a given month, optimized for UI display.
   * Returns different datasets depending on the user's role.
   * @param {string} month - Format 'YYYY-MM'
   * @param {object} user - User object from JWT
   * @returns {object} JSON map of dates to task/activity arrays
   */
  async getCalendarData(month, user) {
    // 1. Parse month to start and end date of that month
    const startDate = moment(`${month}-01`).startOf("month").format("YYYY-MM-DD");
    const endDate = moment(`${month}-01`).endOf("month").format("YYYY-MM-DD");

    const role = user.role; // role is DB-sourced via auth middleware — never from frontend
    const currentUserId = user.user_id?.toString() || user.id?.toString();

    let results = [];

    // 2. Branch logic by role
    if (role === "COMMANDER") {
      // COMMANDER: Can view ALL activities + tasks
      // Uses JOIN to avoid N+1
      const query = `
        SELECT
          t.id AS task_id,
          t.title,
          t.due_date,
          t.status,
          t.team,
          a.id AS activity_id,
          a.name AS activity_name,
          a.work_group
        FROM activity_tasks t
        JOIN activities a ON t.activity_id = a.id
        WHERE t.due_date BETWEEN $1 AND $2
        ORDER BY t.due_date ASC
      `;

      const { rows } = await pool.query(query, [startDate, endDate]);
      results = rows;

    } else {
      // STANDING_MILITIA or Default fallback: Minimal info, filtered by assignee
      const query = `
        SELECT 
          t.id AS task_id, 
          t.title, 
          t.due_date, 
          t.status, 
          t.activity_id
        FROM activity_tasks t
        WHERE t.due_date BETWEEN $1 AND $2
        AND t.assignees @> ARRAY[$3]::text[]
        ORDER BY t.due_date ASC
      `;

      const { rows } = await pool.query(query, [startDate, endDate, currentUserId]);
      results = rows;
    }

    // 3. Transform -> group by date
    const groupedData = {};

    results.forEach((row) => {
      // Convert due_date to 'YYYY-MM-DD' string key safely
      // some drivers return JS Date objects for DATE types, others return strings.
      // moment handles both.
      const dateKey = moment(row.due_date).format("YYYY-MM-DD");

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = [];
      }

      if (role === "COMMANDER") {
        // Group Commander view by Activity -> Tasks natively for nested structure
        // Wait, the prompt requested for COMMANDER:
        // { "2026-03-10": [ { activity_id: 5, activity_name: "Kế hoạch tuần tra", work_group: "DQTT", tasks: [ { task_id: 1, title: "Trực chốt", due_date: "2026-03-10", status: "pending", team: "A" } ] } ] }

        let existingActivity = groupedData[dateKey].find(
          (act) => act.activity_id === row.activity_id
        );

        if (!existingActivity) {
          existingActivity = {
            activity_id: row.activity_id,
            activity_name: row.activity_name,
            work_group: row.work_group,
            tasks: [],
          };
          groupedData[dateKey].push(existingActivity);
        }

        existingActivity.tasks.push({
          task_id: row.task_id,
          title: row.title,
          due_date: dateKey,
          status: row.status,
          team: row.team,
        });

      } else {
        // STANDING_MILITIA format
        // { "2026-03-10": [ { task_id: 1, title: "Trực chốt", due_date: "2026-03-10", status: "pending", activity_id: 5 } ] }
        groupedData[dateKey].push({
          task_id: row.task_id,
          title: row.title,
          due_date: dateKey,
          status: row.status,
          activity_id: row.activity_id,
        });
      }
    });

    return groupedData;
  }
}

module.exports = new CalendarService();

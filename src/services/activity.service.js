const pool = require("../config/db");
const { NotFoundError } = require("../core/error.response");
const paginate = require("../plugins/paginate.plugin");

const getActivities = async (filter, option) => {
  let newFilter = {};

  if (filter.month && filter.year) {
    const startDate = new Date(filter.year, filter.month - 1, 1);
    const endDate = new Date(filter.year, filter.month, 1);

    newFilter.start_date_from = startDate;
    newFilter.start_date_to = endDate;
  }

  // if (user.role !== "admin") {
  //   newFilter.team = user.team;
  // }

  delete filter.month;
  delete filter.year;

  return await paginate({
    pool,
    table: `
      (
        SELECT 
          a.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', t.id,
                'title', t.title,
                'completed', t.completed
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) AS tasks
        FROM activities a
        LEFT JOIN activity_tasks t 
          ON a.id = t.activity_id
        GROUP BY a.id
      ) AS activities
    `,
    filter: newFilter,
    page: Number(option.page) || 1,
    limit: Number(option.limit) || 10,
    sortBy: "created_at",
    order: "DESC",
  });
};

const getActivityById = async (id) => {
  const result = await pool.query(
    `
    SELECT 
      a.*,
      COALESCE(
        json_agg(to_jsonb(t))
        FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tasks
    FROM activities a
    LEFT JOIN activity_tasks t 
      ON a.id = t.activity_id
    WHERE a.id = $1
    GROUP BY a.id
    `,
    [id],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Activity not found");
  }

  return result.rows[0];
};

const createActivity = async (activityData) => {
  const {
    name,
    work_type,
    department,
    start_date,
    end_date,
    location,
    document_number,
    attached_files,
    created_by,
    created_at,
    updated_at,
  } = activityData;

  const result = await pool.query(
    "INSERT INTO activities (name, work_type, department, start_date, end_date, location, document_number, attached_files, created_by, created_at, updated_at, tasks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
    [
      name,
      work_type,
      department,
      start_date,
      end_date,
      location,
      document_number,
      attached_files ? JSON.stringify(attached_files) : null,
      tasks ? JSON.stringify(tasks) : null,
      created_by,
      created_at,
      updated_at,
    ],
  );

  return result.rows[0];
};

const updateStatusActivity = async (id, status) => {
  const result = await pool.query(
    "UPDATE activities SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [status, id],
  );
  return result.rows[0];
};

module.exports = {
  getActivities,
  createActivity,
  getActivityById,
  updateStatusActivity,
};

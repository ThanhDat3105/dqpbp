const pool = require("../config/db");
const { NotFoundError, BadRequestError } = require("../core/error.response");
const paginate = require("../plugins/paginate.plugin");

const getActivities = async (filter, option) => {
  let newFilter = {};

  if (filter.month && filter.year) {
    newFilter.start_date_from = new Date(filter.year, filter.month - 1, 1);
    newFilter.start_date_to = new Date(filter.year, filter.month, 1); // exclusive
  }

  if (filter.status) {
    newFilter.status = filter.status;
  }

  if (filter.from_date) {
    newFilter.end_date_from = filter.from_date;
  }

  if (filter.to_date) {
    newFilter.end_date_lte = filter.to_date;
  }

  // GROUP FILTER LOGIC
  let groupFilterSQL = "";
  if (filter.group === 'overdue') {
    groupFilterSQL = " AND a.end_date < CURRENT_DATE AND a.status != 'completed'";
  } else if (filter.group === 'this_week') {
    groupFilterSQL = " AND a.end_date >= CURRENT_DATE AND a.end_date <= CURRENT_DATE + INTERVAL '7 days' AND a.status != 'completed'";
  } else if (filter.group === 'upcoming') {
    groupFilterSQL = " AND a.end_date > CURRENT_DATE + INTERVAL '7 days' AND a.status != 'completed'";
  } else if (filter.group === 'completed') {
    groupFilterSQL = " AND a.status = 'completed'";
  }

  return await paginate({
    pool,
    table: `
      (
        SELECT 
          a.*,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', t.id,
                  'title', t.title,
                  'status', t.status,
                  'due_date', t.due_date,
                  'report_items', t.report_fields,
                  'assignees', COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object(
                          'id', u.id,
                          'full_name', u.name,
                          'department', u.department_id
                        )
                      )
                      FROM unnest(t.assignees::text[]) AS uid
                      JOIN users u ON u.id::text = uid
                    ), '[]'::json
                  )
                )
              )
              FROM activity_tasks t
              WHERE t.activity_id = a.id
            ),
            '[]'::json
          ) AS tasks,
          COALESCE(
            (
              SELECT json_agg(DISTINCT
                jsonb_build_object(
                  'id', u.id,
                  'full_name', u.name,
                  'department', u.department_id
                )
              )
              FROM activity_tasks t
              CROSS JOIN unnest(t.assignees::text[]) AS uid
              JOIN users u ON u.id::text = uid
              WHERE t.activity_id = a.id
            ),
            '[]'::json
          ) AS assignees
        FROM activities a
        WHERE 1=1 ${groupFilterSQL}
      ) AS activities
    `,
    filter: newFilter,
    page: Number(option.page) || 1,
    limit: Number(option.limit) || 10,
    rawOrderBy: `
      end_date ASC,
      CASE status
        WHEN 'pending'     THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'completed'   THEN 2
        ELSE 99
      END ASC
    `,
  });
};

const getActivityById = async (id) => {
  const result = await pool.query(
    `
    SELECT 
      a.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', t.id,
              'title', t.title,
              'status', t.status,
              'due_date', t.due_date,
              'report_items', t.report_fields,
              'assignees', COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', u.id,
                      'full_name', u.name,
                      'department', u.department_id
                    )
                  )
                  FROM unnest(t.assignees::text[]) AS uid
                  JOIN users u ON u.id::text = uid
                ), '[]'::json
              )
            )
          )
          FROM activity_tasks t
          WHERE t.activity_id = a.id
        ),
        '[]'::json
      ) AS tasks,
      COALESCE(
        (
          SELECT json_agg(DISTINCT
            jsonb_build_object(
              'id', u.id,
              'full_name', u.name,
              'department', u.department_id
            )
          )
          FROM activity_tasks t
          CROSS JOIN unnest(t.assignees::text[]) AS uid
          JOIN users u ON u.id::text = uid
          WHERE t.activity_id = a.id
        ),
        '[]'::json
      ) AS assignees
    FROM activities a
    WHERE a.id = $1
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
    status,
    created_by,
    created_at,
    updated_at,
    tasks = [],
  } = activityData;

  const start = new Date(start_date);
  const end = new Date(end_date);

  if (start > end) {
    throw new BadRequestError(
      "start_date must be less than or equal to end_date",
    );
  }

  // 1. Insert activity
  const activityResult = await pool.query(
    `
      INSERT INTO activities (
        name, work_type, department, start_date, end_date,
        location, document_number, attached_files, status,
        created_by, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
      `,
    [
      name,
      work_type,
      department,
      start_date,
      end_date,
      location,
      document_number,
      attached_files ? JSON.stringify(attached_files) : null,
      status,
      created_by,
      created_at,
      updated_at,
    ],
  );

  const activity = activityResult.rows[0];

  if (tasks.length > 0) {
    for (const task of tasks) {
      await pool.query(
        `
          INSERT INTO activity_tasks (
            activity_id,
            title,
            team,
            assignees,
            status,
            completed,
            due_date,
            notes,
            report_fields,
            accepted_at,
            created_at,
            updated_at,
            requires_dqcd
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          `,
        [
          activity.id,
          task.title,
          task.team,
          task.assignees,
          task.status || "pending",
          task.completed || false,
          task.due_date,
          task.notes || null,
          JSON.stringify(task.report_fields || []),
          task.accepted_at || null,
          task.created_at,
          task.updated_at,
          task.requires_dqcd || false,
        ],
      );
    }
  }

  return await getActivityById(activity.id);
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

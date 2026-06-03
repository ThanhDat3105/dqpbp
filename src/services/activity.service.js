const pool = require("../config/db");
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} = require("../core/error.response");
const paginate = require("../plugins/paginate.plugin");

const getActivities = async (filter, option) => {
  // ROLE-BASED ACCESS
  if (filter.role === "DQCD") {
    return { results: [], total: 0, page: 1, limit: 10 };
  }

  let params = [];
  let paramIndex = 1;

  let whereSQL = "WHERE 1=1";

  // ===== ROLE FILTER =====
  if (filter.role === "DQTT") {
    whereSQL += ` AND EXISTS (
      SELECT 1
      FROM activity_tasks t
      JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.activity_id = a.id
        AND ta.user_id = $${paramIndex}
    )`;
    params.push(filter.userId);
    paramIndex++;
  }

  // ===== DATE FILTER =====
  if (filter.month && filter.year) {
    const start = new Date(filter.year, filter.month - 1, 1);
    const end = new Date(filter.year, filter.month, 1);

    whereSQL += ` AND a.start_date >= $${paramIndex}`;
    params.push(start);
    paramIndex++;

    whereSQL += ` AND a.start_date < $${paramIndex}`;
    params.push(end);
    paramIndex++;
  }

  if (filter.from_date) {
    whereSQL += ` AND a.end_date >= $${paramIndex}`;
    params.push(filter.from_date);
    paramIndex++;
  }

  if (filter.to_date) {
    whereSQL += ` AND a.end_date <= $${paramIndex}`;
    params.push(filter.to_date);
    paramIndex++;
  }

  // ===== STATUS FILTER =====
  if (filter.status) {
    if (filter.status === "overdue") {
      whereSQL += `
      AND DATE(a.end_date) < CURRENT_DATE
      AND a.status != 'cancelled'
    `;
    } else {
      whereSQL += ` AND a.status = $${paramIndex}`;
      params.push(filter.status);
      paramIndex++;
    }
  }

  // ===== GROUP FILTER =====
  if (filter.group === "overdue") {
    whereSQL += ` AND a.end_date < CURRENT_DATE AND a.status != 'completed'`;
  } else if (filter.group === "this_week") {
    whereSQL += ` AND a.end_date >= CURRENT_DATE 
                  AND a.end_date <= CURRENT_DATE + INTERVAL '7 days' 
                  AND a.status != 'completed'`;
  } else if (filter.group === "upcoming") {
    whereSQL += ` AND a.end_date > CURRENT_DATE + INTERVAL '7 days' 
                  AND a.status != 'completed'`;
  } else if (filter.group === "completed") {
    whereSQL += ` AND a.status = 'completed'`;
  }

  // ===== MAIN QUERY =====
  const query = `
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
              'report_fields', t.report_fields,
              'assignees', COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', u.id,
                      'name', u.name,
                      'department', u.department_id
                    )
                  )
                  FROM task_assignees ta
                  JOIN users u ON u.id = ta.user_id
                  WHERE ta.task_id = t.id
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
              'name', u.name,
              'department', u.department_id
            )
          )
          FROM activity_tasks t
          JOIN task_assignees ta ON ta.task_id = t.id
          JOIN users u ON u.id = ta.user_id
          WHERE t.activity_id = a.id
        ),
        '[]'::json
      ) AS assignees

    FROM activities a
    ${whereSQL}
  `;

  // ===== COUNT QUERY (QUAN TRỌNG NHẤT) =====
  const countQuery = `
    SELECT COUNT(*) FROM activities a
    ${whereSQL}
  `;

  const page = Number(option.page) || 1;
  const limit = Number(option.limit) || 10;
  const offset = (page - 1) * limit;

  const client = await pool.connect();

  try {
    // total đúng 100%
    const countResult = await client.query(countQuery, params);
    const total = Number(countResult.rows[0].count);

    // data query + sort + paginate
    const dataResult = await client.query(
      `
      ${query}
      ORDER BY 
        a.end_date ASC,
        CASE a.status
          WHEN 'pending'     THEN 0
          WHEN 'in_progress' THEN 1
          WHEN 'completed'   THEN 2
          ELSE 99
        END ASC,
        a.id ASC
      LIMIT ${limit} OFFSET ${offset}
      `,
      params,
    );

    return {
      results: dataResult.rows,
      total,
      page,
      limit,
    };
  } finally {
    client.release();
  }
};

const getActivityById = async (id, user_id, role) => {
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
              'start_date', t.start_date,
              'due_date', t.due_date,
              'report_fields', t.report_fields,
              'requires_dqcd', t.requires_dqcd,
              'team', t.team,
              'assignees', COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', u.id,
                      'name', u.name,
                      'department', u.department_id
                    )
                  )
                  FROM task_assignees ta
                  JOIN users u ON u.id = ta.user_id
                  WHERE ta.task_id = t.id
                ), '[]'::json
              )
            ) ORDER BY 
              CASE t.status
                WHEN 'in_progress' THEN 1
                WHEN 'pending'     THEN 2
                WHEN 'completed'   THEN 3
                ELSE 4
              END ASC,
              t.start_date ASC
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
              'name', u.name,
              'department', u.department_id
            )
          )
          FROM activity_tasks t
          JOIN task_assignees ta ON ta.task_id = t.id
          JOIN users u ON u.id = ta.user_id
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

  const activity = result.rows[0];

  const privilegedRoles = ["CHI_HUY", "TO_TRUONG"];
  const isPrivileged = privilegedRoles.includes(role);

  if (!isPrivileged) {
    const isAssigned = activity.assignees?.some((a) => a.id === user_id);

    if (!isAssigned) {
      throw new ForbiddenError("Bạn không có quyền truy cập hoạt động này");
    }
  }

  return activity;
};

const createActivity = async (activityData, user_id, role) => {
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
      created_by ? String(created_by) : 'admin',
      created_at,
      updated_at,
    ],
  );

  const activity = activityResult.rows[0];

  if (tasks.length > 0) {
    for (const task of tasks) {
      const taskResult = await pool.query(
        `
          INSERT INTO activity_tasks (
            activity_id,
            title,
            team,
            status,
            start_date,
            due_date,
            notes,
            report_fields,
            accepted_at,
            created_at,
            updated_at,
            requires_dqcd
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          RETURNING id
          `,
        [
          activity.id,
          task.title,
          task.team,
          task.status || "pending",
          task.start_date,
          task.due_date,
          task.notes || null,
          JSON.stringify(task.report_fields || []),
          task.accepted_at || null,
          task.created_at,
          task.updated_at,
          task.requires_dqcd || false,
        ],
      );

      const insertedTaskId = taskResult.rows[0].id;

      if (Array.isArray(task.assignees) && task.assignees.length > 0) {
        for (const userId of task.assignees) {
          await pool.query(
            `
              INSERT INTO task_assignees (task_id, user_id, role)
              VALUES ($1, $2, $3)
            `,
            [insertedTaskId, userId, task.role || "DQTT"],
          );
        }
      }
    }
  }

  return await getActivityById(activity.id, user_id, role);
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

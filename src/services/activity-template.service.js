"use strict";

const pool = require("../config/db");
const { BadRequestError, NotFoundError } = require("../core/error.response");
const activityService = require("./activity.service");

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
};

const diffInDays = (date, baseDate) => {
  const start = new Date(baseDate);
  const end = new Date(date);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end - start) / dayMs));
};

const normalizeTask = (task, index = 0) => ({
  title: task.title,
  team: task.team || [],
  assignees: task.assignees || [],
  notes: task.notes || null,
  report_fields:
    task.report_fields !== undefined ? task.report_fields : task.reportFields || [],
  requires_dqcd: task.requires_dqcd || false,
  start_offset_days: Number(task.start_offset_days || 0),
  due_offset_days: Number(task.due_offset_days || 0),
  display_order: Number(task.display_order ?? index),
});

const ensureTaskOffsetsAreValid = (tasks) => {
  for (const task of tasks) {
    if (task.start_offset_days > task.due_offset_days) {
      throw new BadRequestError(
        "task start_offset_days must be less than or equal to due_offset_days",
      );
    }
  }
};

const mapTemplateRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  work_type: row.work_type,
  department: row.department,
  location: row.location,
  document_number: row.document_number,
  status: row.status,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
  tasks: row.tasks || [],
});

const getTemplateById = async (id, client = pool) => {
  const result = await client.query(
    `
      SELECT
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tt.id,
              'title', tt.title,
              'team', tt.team,
              'assignees', tt.assignees,
              'notes', tt.notes,
              'report_fields', tt.report_fields,
              'requires_dqcd', tt.requires_dqcd,
              'start_offset_days', tt.start_offset_days,
              'due_offset_days', tt.due_offset_days,
              'display_order', tt.display_order
            )
            ORDER BY tt.display_order ASC, tt.id ASC
          ) FILTER (WHERE tt.id IS NOT NULL),
          '[]'::json
        ) AS tasks
      FROM activity_templates t
      LEFT JOIN activity_template_tasks tt ON tt.template_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `,
    [id],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Activity template not found");
  }

  return mapTemplateRow(result.rows[0]);
};

const getTemplates = async (filter = {}) => {
  const page = Number(filter.page) || 1;
  const limit = Number(filter.limit) || 20;
  const offset = (page - 1) * limit;
  const params = [];
  let paramIndex = 1;
  let whereSQL = "WHERE 1=1";

  if (filter.status) {
    whereSQL += ` AND t.status = $${paramIndex}`;
    params.push(filter.status);
    paramIndex++;
  }

  if (filter.work_type) {
    whereSQL += ` AND t.work_type = $${paramIndex}`;
    params.push(filter.work_type);
    paramIndex++;
  }

  if (filter.department) {
    whereSQL += ` AND t.department = $${paramIndex}`;
    params.push(filter.department);
    paramIndex++;
  }

  if (filter.search) {
    whereSQL += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
    params.push(`%${filter.search}%`);
    paramIndex++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM activity_templates t ${whereSQL}`,
    params,
  );

  const dataResult = await pool.query(
    `
      SELECT
        t.*,
        COALESCE(COUNT(tt.id), 0)::int AS task_count
      FROM activity_templates t
      LEFT JOIN activity_template_tasks tt ON tt.template_id = t.id
      ${whereSQL}
      GROUP BY t.id
      ORDER BY t.updated_at DESC, t.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    params,
  );

  return {
    results: dataResult.rows,
    total: Number(countResult.rows[0].count),
    page,
    limit,
  };
};

const insertTemplateTasks = async (client, templateId, tasks) => {
  for (const [index, rawTask] of tasks.entries()) {
    const task = normalizeTask(rawTask, index);
    await client.query(
      `
        INSERT INTO activity_template_tasks (
          template_id, title, team, assignees, notes, report_fields,
          requires_dqcd, start_offset_days, due_offset_days, display_order
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        templateId,
        task.title,
        task.team,
        task.assignees,
        task.notes,
        JSON.stringify(task.report_fields),
        task.requires_dqcd,
        task.start_offset_days,
        task.due_offset_days,
        task.display_order,
      ],
    );
  }
};

const createTemplate = async (templateData, createdBy) => {
  const tasks = (templateData.tasks || []).map(normalizeTask);
  ensureTaskOffsetsAreValid(tasks);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const templateResult = await client.query(
      `
        INSERT INTO activity_templates (
          name, description, work_type, department, location,
          document_number, status, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
      `,
      [
        templateData.name,
        templateData.description || null,
        templateData.work_type || null,
        templateData.department || null,
        templateData.location || null,
        templateData.document_number || null,
        templateData.status || "active",
        createdBy,
      ],
    );

    await insertTemplateTasks(client, templateResult.rows[0].id, tasks);
    await client.query("COMMIT");

    return getTemplateById(templateResult.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateTemplate = async (id, templateData) => {
  if (templateData.tasks) {
    const tasks = templateData.tasks.map(normalizeTask);
    ensureTaskOffsetsAreValid(tasks);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query(
      "SELECT id FROM activity_templates WHERE id = $1",
      [id],
    );

    if (current.rows.length === 0) {
      throw new NotFoundError("Activity template not found");
    }

    const fields = [
      "name",
      "description",
      "work_type",
      "department",
      "location",
      "document_number",
      "status",
    ];
    const updates = [];
    const params = [];

    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(templateData, field)) {
        params.push(templateData[field]);
        updates.push(`${field} = $${params.length}`);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      await client.query(
        `
          UPDATE activity_templates
          SET ${updates.join(", ")}, updated_at = NOW()
          WHERE id = $${params.length}
        `,
        params,
      );
    }

    if (templateData.tasks) {
      await client.query(
        "DELETE FROM activity_template_tasks WHERE template_id = $1",
        [id],
      );
      await insertTemplateTasks(client, id, templateData.tasks);
    }

    await client.query("COMMIT");
    return getTemplateById(id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteTemplate = async (id) => {
  const result = await pool.query(
    "DELETE FROM activity_templates WHERE id = $1 RETURNING id",
    [id],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Activity template not found");
  }
};

const createActivityFromTemplate = async (
  templateId,
  activityData,
  userId,
  role,
) => {
  const template = await getTemplateById(templateId);

  if (template.status !== "active") {
    throw new BadRequestError("Cannot create activity from inactive template");
  }

  const activityStart = new Date(activityData.start_date);
  const activityEnd = new Date(activityData.end_date);

  if (activityStart > activityEnd) {
    throw new BadRequestError(
      "start_date must be less than or equal to end_date",
    );
  }

  const tasks = template.tasks.map((task) => {
    const taskStart = addDays(activityStart, task.start_offset_days);
    const taskEnd = addDays(activityStart, task.due_offset_days);

    if (taskEnd > activityEnd) {
      throw new BadRequestError(
        `Task "${task.title}" due date exceeds activity end_date`,
      );
    }

    return {
      title: task.title,
      team: task.team || [],
      assignees: task.assignees || [],
      status: "pending",
      start_date: taskStart,
      due_date: taskEnd,
      notes: task.notes,
      report_fields: task.report_fields || [],
      requires_dqcd: task.requires_dqcd || false,
    };
  });

  return activityService.createActivity(
    {
      name: activityData.name,
      work_type: activityData.work_type || template.work_type,
      department: activityData.department || template.department,
      start_date: activityData.start_date,
      end_date: activityData.end_date,
      location:
        activityData.location !== undefined
          ? activityData.location
          : template.location,
      document_number:
        activityData.document_number !== undefined
          ? activityData.document_number
          : template.document_number,
      status: activityData.status || "pending",
      created_by: activityData.created_by || userId,
      created_at: new Date(),
      updated_at: new Date(),
      tasks,
    },
    userId,
    role,
  );
};

const createTemplateFromActivity = async (activityId, payload, createdBy) => {
  const result = await pool.query(
    `
      SELECT
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'title', t.title,
              'team', t.team,
              'assignees', COALESCE(
                (
                  SELECT array_agg(ta.user_id)
                  FROM task_assignees ta
                  WHERE ta.task_id = t.id
                ), '{}'::int[]
              ),
              'notes', t.notes,
              'report_fields', t.report_fields,
              'requires_dqcd', t.requires_dqcd,
              'start_offset_days', GREATEST(
                0,
                FLOOR(EXTRACT(EPOCH FROM (t.start_date::timestamp - a.start_date::timestamp)) / 86400)::int
              ),
              'due_offset_days', GREATEST(
                0,
                FLOOR(EXTRACT(EPOCH FROM (t.due_date::timestamp - a.start_date::timestamp)) / 86400)::int
              ),
              'display_order', t.id
            )
            ORDER BY t.start_date ASC, t.due_date ASC, t.id ASC
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS tasks
      FROM activities a
      LEFT JOIN activity_tasks t ON t.activity_id = a.id
      WHERE a.id = $1
      GROUP BY a.id
    `,
    [activityId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Activity not found");
  }

  const activity = result.rows[0];
  const tasks = (activity.tasks || []).map((task, index) => ({
    ...task,
    start_offset_days:
      task.start_offset_days ?? diffInDays(task.start_date, activity.start_date),
    due_offset_days:
      task.due_offset_days ?? diffInDays(task.due_date, activity.start_date),
    display_order: index,
  }));

  if (tasks.length === 0) {
    throw new BadRequestError("Activity must have at least one task");
  }

  return createTemplate(
    {
      name: payload.name || activity.name,
      description: payload.description || null,
      work_type: activity.work_type,
      department: activity.department,
      location: activity.location,
      document_number: activity.document_number,
      status: payload.status || "active",
      tasks,
    },
    createdBy,
  );
};

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createActivityFromTemplate,
  createTemplateFromActivity,
};

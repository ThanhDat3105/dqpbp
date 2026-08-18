const activityTaskService = require("../services/activity-task.service");
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
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require("../core/error.response");
const { SUCCESS, SuccessResponse } = require("../core/success.response");

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestError(`${fieldName} must be a positive integer`);
  }

  return parsed;
};

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
    throw new BadRequestError(
      "period must be one of: month, week, quarter, year",
    );
  }

  return getRangeByPeriod(normalizedPeriod);
};

const getTaskList = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const dateRange = parseDateRange({ period, from, to });
    const requesterId = req.user?.id ?? req.user?.user_id;
    const requesterRole = req.user?.role;

    let page = 1;
    if (req.query.page !== undefined) {
      page = parsePositiveInteger(req.query.page, "page");
    }

    let assignee = null;
    if (req.query.assignee !== undefined) {
      assignee = parsePositiveInteger(req.query.assignee, "assignee");
    }

    let limit = 20;
    if (req.query.limit !== undefined) {
      limit = parsePositiveInteger(req.query.limit, "limit");
    }
    limit = Math.min(limit, 50);

    const sort = req.query.sort ? String(req.query.sort) : "due_date_desc";
    const allowedSorts = ["due_date_asc", "due_date_desc", "created_desc"];

    if (!allowedSorts.includes(sort)) {
      throw new BadRequestError(
        "sort must be one of: due_date_asc, due_date_desc, created_desc",
      );
    }

    const status = req.query.status ? String(req.query.status) : null;

    let activityId = null;
    if (req.query.activity_id !== undefined) {
      activityId = parsePositiveInteger(req.query.activity_id, "activity_id");
    }

    if (requesterRole === "DQCD") {
      if (!requesterId) {
        throw new ForbiddenError("Authentication required");
      }

      if (assignee !== null && String(assignee) !== String(requesterId)) {
        throw new ForbiddenError("DQCD can only query own tasks");
      }

      if (assignee === null) {
        assignee = requesterId;
      }
    }

    const result = await activityTaskService.getTaskList({
      assignee,
      page,
      limit,
      sort,
      status,
      activity_id: activityId,
      from: dateRange.from,
      to: dateRange.to,
    });

    const data = result.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      due_date: task.due_date,
      completed_at: task.completed_at,
      notes: task.notes,
      requires_dqcd: task.requires_dqcd,
      activity: {
        id: task.activity_id,
        name: task.activity_name,
        work_type: task.work_type,
      },
    }));

    return res.status(200).json({
      data,
      meta: {
        page,
        limit,
        sort,
        total: result.total,
        period: dateRange,
      },
    });
  } catch (error) {
    console.error("getTaskList controller error:", error);
    next(error);
  }
};

const createActivityTask = async (req, res) => {
  try {
    const data = await activityTaskService.createActivityTask(req.body);
    res.status(201).json({
      status: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const updateActivityTaskStatus = async (req, res, next) => {
  try {
    const data = await activityTaskService.updateActivityTaskStatus(
      req.params.id,
      req.body,
      req.user,
    );

    return res.status(200).json({
      status: true,
      data: {
        id: data.id,
        status: data.status,
        dqcd_unit: data.dqcd_unit ?? null,
        report_fields: data.report_fields ?? [],
        updated_at: data.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateActivityTask = async (req, res, next) => {
  try {
    const { activityId, taskId } = req.params;

    // Call service to perform update
    const updatedTask = await activityTaskService.updateActivityTask(
      taskId,
      activityId,
      req.body,
    );

    if (!updatedTask) {
      throw new NotFoundError(
        `Task with ID ${taskId} not found in Activity ${activityId}`,
      );
    }

    return new SuccessResponse({
      message: "Task updated successfully",
      metaData: updatedTask,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const assignDQCD = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      throw new BadRequestError("user_ids must be a non-empty array");
    }

    const result = await activityTaskService.assignDQCD(taskId, user_ids);

    return new SuccessResponse({
      message: "DQCD assigned successfully",
      metaData: result,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const updateDQCDAssignees = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids)) {
      throw new BadRequestError("user_ids must be an array");
    }

    const result = await activityTaskService.updateDQCDAssignees(
      taskId,
      user_ids,
    );

    return new SuccessResponse({
      message: "DQCD assignees updated",
      metaData: result,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTaskList,
  createActivityTask,
  updateActivityTaskStatus,
  updateActivityTask,
  assignDQCD,
  updateDQCDAssignees,
};

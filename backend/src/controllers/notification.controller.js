"use strict";

const { SuccessResponse } = require("../core/success.response");
const notificationService = require("../services/notification.service");

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;

    const limitValue = parseInt(req.query.limit, 10);
    const offsetValue = parseInt(req.query.offset, 10);

    const limit = Number.isNaN(limitValue) ? 20 : Math.max(limitValue, 0);
    const offset = Number.isNaN(offsetValue) ? 0 : Math.max(offsetValue, 0);

    let is_read;
    if (req.query.is_read === "true") {
      is_read = true;
    } else if (req.query.is_read === "false") {
      is_read = false;
    }

    const data = await notificationService.getNotificationsByUser(userId, {
      is_read,
      limit,
      offset,
    });

    return res.status(200).json(data);
  } catch (error) {
    if (error?.status) {
      return next(error);
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    const notificationId = parseInt(req.params.id, 10);

    if (Number.isNaN(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const data = await notificationService.markAsRead(notificationId, userId);

    return res.status(200).json({
      message: "Marked as read",
      data,
    });
  } catch (error) {
    if (error?.status) {
      return next(error);
    }

    return res.status(500).json({ error: "Internal server error" });
  }
};

const getTodayDigest = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    const data = await notificationService.getTodayDigest(userId);

    return new SuccessResponse({
      message: "Digest retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const markTaskAsRead = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    const taskId = Number(req.params.taskId);
    const data = await notificationService.markTaskAsRead(userId, taskId);

    return new SuccessResponse({
      message: "Task marked as read",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    const data = await notificationService.markAllAsRead(userId);

    return new SuccessResponse({
      message: "All tasks marked as read",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const triggerDigest = async (req, res) => {
  try {
    await notificationService.generateDigestForAllUsers();
    await notificationService.checkDeadlineReminders();
    res.json({ message: "Digest triggered for all users" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  getTodayDigest,
  markTaskAsRead,
  markAllAsRead,
  triggerDigest,
};

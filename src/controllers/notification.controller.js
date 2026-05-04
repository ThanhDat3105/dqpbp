"use strict";

const { SuccessResponse } = require("../core/success.response");
const notificationService = require("../services/notification.service");

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
    res.json({ message: "Digest triggered for all users" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = { getTodayDigest, markTaskAsRead, markAllAsRead, triggerDigest };

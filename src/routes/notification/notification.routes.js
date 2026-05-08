"use strict";

const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notification.controller");
const { authentication } = require("../../middlewares/auth.middleware");

router.use(authentication);

router.get("/", notificationController.getNotifications);
router.get("/digest", notificationController.getTodayDigest);
router.patch(
  "/digest/task/:taskId/read",
  notificationController.markTaskAsRead,
);
router.patch("/digest/read", notificationController.markAllAsRead);
router.post("/digest/trigger", notificationController.triggerDigest);
router.patch("/:id/read", notificationController.markNotificationRead);

module.exports = router;

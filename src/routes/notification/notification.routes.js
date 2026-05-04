"use strict";

const express = require("express");
const router = express.Router();
const notificationController = require("../../controllers/notification.controller");
const { authentication } = require("../../middlewares/auth.middleware");

router.use(authentication);

router.get("/digest", notificationController.getTodayDigest);
router.patch(
  "/digest/task/:taskId/read",
  notificationController.markTaskAsRead,
);
router.patch("/digest/read", notificationController.markAllAsRead);
router.post("/digest/trigger", notificationController.triggerDigest);

module.exports = router;

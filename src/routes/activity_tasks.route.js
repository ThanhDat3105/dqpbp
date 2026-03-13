const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const activityTaskController = require("../controllers/activity-task.controller");

router.post(
  "/",
  validate("createActivityTask"),
  activityTaskController.createActivityTask,
);

router.put(
  "/:id",
  validate("updateActivityTaskStatus"),
  activityTaskController.updateActivityTaskStatus,
);

module.exports = router;

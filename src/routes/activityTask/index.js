const express = require("express");
const router = express.Router();
const validate = require("../../middlewares/validate");
const activityTaskController = require("../../controllers/activity-task.controller");
const { authentication } = require("../../middlewares/auth.middleware");

router.post(
  "/",
  authentication,
  validate("createActivityTask"),
  activityTaskController.createActivityTask,
);

router.put(
  "/:id",
  authentication,
  validate("updateActivityTaskStatus"),
  activityTaskController.updateActivityTaskStatus,
);

module.exports = router;

const express = require("express");
const router = express.Router();
const validate = require("../../middlewares/validate");
const activityTaskController = require("../../controllers/activity-task.controller");
const { activityTaskValidation } = require("../../validations");
const { authentication } = require("../../middlewares/auth.middleware");

router.post(
  "/",
  authentication,
  validate(activityTaskValidation.createActivityTask),
  activityTaskController.createActivityTask,
);

router.put(
  "/:id",
  authentication,
  validate(activityTaskValidation.updateActivityTaskStatus),
  activityTaskController.updateActivityTaskStatus,
);

// Nested route: PUT /api/activities/:activityId/tasks/:taskId
router.patch(
  "/:activityId/tasks/:taskId",
  authentication,
  validate(activityTaskValidation.updateActivityTask),
  activityTaskController.updateActivityTask,
);

module.exports = router;

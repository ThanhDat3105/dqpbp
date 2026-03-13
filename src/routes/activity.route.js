const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");
const validate = require("../middlewares/validate");
const { activityValidation } = require("../validations");

router.get("/", activityController.getActivities);
router.get("/:id", activityController.getActivityById);
router.post(
  "/",
  validate(activityValidation.createActivity),
  activityController.createActivity,
);

module.exports = router;

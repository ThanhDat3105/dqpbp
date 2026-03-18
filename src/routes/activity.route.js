const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");
const validate = require("../middlewares/validate");
const { activityValidation } = require("../validations");
const { uploadDocument } = require("../config/multer.config");

router.get("/", activityController.getActivities);
router.get("/:id", activityController.getActivityById);
router.post(
  "/",
  uploadDocument.single("attached_files"),
  validate(activityValidation.createActivity),
  activityController.createActivity,
);

module.exports = router;

const express = require("express");
const router = express.Router();
const validate = require("../../middlewares/validate");
const activityTemplateController = require("../../controllers/activity-template.controller");
const { activityTemplateValidation } = require("../../validations");
const { authentication } = require("../../middlewares/auth.middleware");

router.get(
  "/",
  authentication,
  validate(activityTemplateValidation.getTemplates),
  activityTemplateController.getTemplates,
);

router.post(
  "/",
  authentication,
  validate(activityTemplateValidation.createTemplate),
  activityTemplateController.createTemplate,
);

router.post(
  "/from-activity/:activityId",
  authentication,
  validate(activityTemplateValidation.createTemplateFromActivity),
  activityTemplateController.createTemplateFromActivity,
);

router.get(
  "/:id",
  authentication,
  validate(activityTemplateValidation.getTemplateById),
  activityTemplateController.getTemplateById,
);

router.put(
  "/:id",
  authentication,
  validate(activityTemplateValidation.updateTemplate),
  activityTemplateController.updateTemplate,
);

router.delete(
  "/:id",
  authentication,
  validate(activityTemplateValidation.deleteTemplate),
  activityTemplateController.deleteTemplate,
);

router.post(
  "/:id/create-activity",
  authentication,
  validate(activityTemplateValidation.createActivityFromTemplate),
  activityTemplateController.createActivityFromTemplate,
);

module.exports = router;

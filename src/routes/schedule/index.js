"use strict";

const express = require("express");
const router = express.Router();
const scheduleController = require("../../controllers/schedule.controller");

router.get("/weekly", scheduleController.getWeekly);
router.put("/template", scheduleController.upsertTemplate);
router.delete("/template", scheduleController.deleteTemplate);
router.put("/mobilize", scheduleController.updateMobilize);

module.exports = router;

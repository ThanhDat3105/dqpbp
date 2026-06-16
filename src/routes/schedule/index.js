"use strict";

const express = require("express");
const router = express.Router();
const scheduleController = require("../../controllers/schedule.controller");

router.get("/weekly", scheduleController.getWeekly);
router.put("/template", scheduleController.upsertTemplate);
router.delete("/template", scheduleController.deleteTemplate);
router.put("/mobilize", scheduleController.updateMobilize);
router.post('/register', scheduleController.registerSchedule)
router.delete('/register', scheduleController.deleteRegisteredSchedule)

module.exports = router;

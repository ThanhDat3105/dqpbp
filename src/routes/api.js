const express = require("express");
const router = express.Router();

const activityRoute = require("./activity");
const activityTaskRoute = require("./activityTask");
const calendarRoute = require("./calendar");
const authRoute = require("./auth");
const scheduleRoute = require("./schedule");
const schedulesRoute = require("./schedules");

router.use("/activities", activityRoute);
router.use("/activities-task", activityTaskRoute);
router.use("/calendar", calendarRoute);
router.use("/auth", authRoute);
router.use("/schedule", scheduleRoute);
router.use("/schedules", schedulesRoute);
module.exports = router;

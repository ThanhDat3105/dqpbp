const express = require("express");
const router = express.Router();

const activityRoute = require("./activity.route");
const activityTaskRoute = require("./activity_tasks.route");
const calendarRoute = require("./calendar.route");
const authRoute = require("./auth.route");

router.use("/activities", activityRoute);
router.use("/activities-task", activityTaskRoute);
router.use("/calendar", calendarRoute);
router.use("/auth", authRoute);

module.exports = router;

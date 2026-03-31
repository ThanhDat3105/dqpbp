const express = require("express");
const router = express.Router();

const activityRoute = require("./activity");
const activityTaskRoute = require("./activityTask");
const calendarRoute = require("./calendar");
const authRoute = require("./auth");

router.use("/activities", activityRoute);
router.use("/activities-task", activityTaskRoute);
router.use("/calendar", calendarRoute);
router.use("/auth", authRoute);

module.exports = router;

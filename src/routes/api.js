const express = require("express");
const router = express.Router();

const activityRoute = require("./activity.route");
const activityTaskRoute = require("./activity_tasks.route");

router.use("/activities", activityRoute);
router.use("/activities-task", activityTaskRoute);

module.exports = router;

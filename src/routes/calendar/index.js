const express = require("express");
const router = express.Router();
const calendarController = require("../../controllers/calendar.controller");
const validate = require("../../middlewares/validate");
const { getCalendar } = require("../../validations/calendar.validation");
const { authentication } = require("../../middlewares/auth.middleware");

// GET /api/calendar?view=month&date=YYYY-MM-DD
router.get(
  "/",
  authentication,        // populate req.user with DB-verified role/team
  validate(getCalendar), // validate query params view + date
  calendarController.getCalendar
);

module.exports = router;

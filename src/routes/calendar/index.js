const express = require("express");
const router = express.Router();
const calendarController = require("../../controllers/calendar.controller");
const validate = require("../../middlewares/validate");
const { getCalendar } = require("../../validations/calendar.validation");
const { authentication } = require("../../middlewares/auth.middleware");

// GET /api/calendar?month=YYYY-MM
router.get(
  "/",
  authentication,       // populate req.user with DB-verified role
  validate(getCalendar), // validate query param month
  calendarController.getCalendar
);

module.exports = router;

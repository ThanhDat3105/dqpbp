const { SuccessResponse } = require("../core/success.response");
const calendarService = require("../services/calendar.service");

const getCalendar = async (req, res, next) => {
  try {
    const { month } = req.query;
    const user = req.user; // populated by authentication middleware

    const data = await calendarService.getCalendarData(month, user);

    return new SuccessResponse({
      message: "Calendar data retrieved successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCalendar,
};

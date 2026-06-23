"use strict";

const { startDailyDigestJob } = require("./dailyDigest.job");
const {
  startYouthAutoPromoteJob,
  runYouthAutoPromote,
} = require("./youthAutoPromote.job");

const startJobs = () => {
  startDailyDigestJob();
  startYouthAutoPromoteJob();
};

module.exports = { startJobs, runYouthAutoPromote };

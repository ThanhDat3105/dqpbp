"use strict";

const { startDailyDigestJob } = require("./dailyDigest.job");

const startJobs = () => {
  startDailyDigestJob();
};

module.exports = { startJobs };

"use strict";

const cron = require("node-cron");
const youthService = require("../services/youth.service");

const runYouthAutoPromote = async (source = "cron") => {
  console.log(`[YouthAutoPromote] Running (${source}) at`, new Date().toLocaleString("vi-VN"));
  try {
    const result = await youthService.autoPromoteEligibleYouth();
    console.log(
      `[YouthAutoPromote] Done - promoted ${result.promoted} record(s)`,
    );
    return result;
  } catch (error) {
    console.error("[YouthAutoPromote] Error:", error?.message || error);
    throw error;
  }
};

const startYouthAutoPromoteJob = () => {
  cron.schedule(
    "5 0 * * *",
    () => runYouthAutoPromote("cron"),
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log("[YouthAutoPromote] Scheduled at 00:05 ICT daily");
};

module.exports = {
  startYouthAutoPromoteJob,
  runYouthAutoPromote,
};

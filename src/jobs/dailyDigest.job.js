"use strict";

const cron = require("node-cron");
const notificationService = require("../services/notification.service");

const startDailyDigestJob = () => {
  cron.schedule(
    "0 5 * * *",
    async () => {
      console.log(
        "[DailyDigest] Running at",
        new Date().toLocaleString("vi-VN"),
      );
      try {
        const count = await notificationService.generateDigestForAllUsers();
        console.log(`[DailyDigest] Done - generated for ${count} users`);
      } catch (error) {
        console.error("[DailyDigest] Error:", error?.message || error);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log("[DailyDigest] Scheduled at 05:00 ICT daily");
};

module.exports = { startDailyDigestJob };

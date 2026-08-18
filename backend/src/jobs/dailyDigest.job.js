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

const startDeadlineReminderJob = () => {
  cron.schedule(
    "*/30 * * * *",
    async () => {
      console.log(
        "[DeadlineReminder] Running at",
        new Date().toLocaleString("vi-VN"),
      );
      try {
        await notificationService.checkDeadlineReminders();
      } catch (err) {
        console.error("[DeadlineReminder] Error:", err?.message || err);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    },
  );

  console.log("[DeadlineReminder] Scheduled every 30 minutes");
};

module.exports = { startDailyDigestJob, startDeadlineReminderJob };

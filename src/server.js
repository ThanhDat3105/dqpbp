"use strict";

require("dotenv").config();
const app = require("./app");
const pool = require("./config/db"); // PostgreSQL pool
const {
  connectPrisma,
  disconnectPrisma,
} = require("./config/prisma");
const {
  startDailyDigestJob,
  startDeadlineReminderJob,
} = require("./jobs/dailyDigest.job");
const {
  startYouthAutoPromoteJob,
  runYouthAutoPromote,
} = require("./jobs/youthAutoPromote.job");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test PostgreSQL connection
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected successfully");

    // Prisma is wired for upcoming incremental refactors.
    try {
      await connectPrisma();
      console.log("✅ Prisma client connected successfully");
    } catch (error) {
      console.warn("⚠️ Prisma not ready yet:", error.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`Management Ward start with: http://localhost:${PORT}`);
      console.log(
        `Management Ward Swagger start with: http://localhost:${PORT}/api-docs`,
      );
      startDailyDigestJob();
      startDeadlineReminderJob();
      startYouthAutoPromoteJob();
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Closing server...");

      try {
        await pool.end(); // đóng PostgreSQL connection pool
        console.log("PostgreSQL disconnected");
      } catch (error) {
        console.error("Error closing PostgreSQL connection:", error);
      }

      try {
        await disconnectPrisma();
        console.log("Prisma disconnected");
      } catch (error) {
        console.error("Error closing Prisma connection:", error);
      }

      server.close(() => {
        console.log("Exit Server Express");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Cannot connect to PostgreSQL:", {
      message: error.message,
      code: error.code,
      host: error.host,
      port: error.port,
    });
    process.exit(1);
  }
}

startServer();

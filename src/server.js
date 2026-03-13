"use strict";

require("dotenv").config();
const app = require("./app");
const pool = require("./config/db"); // PostgreSQL pool

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test PostgreSQL connection
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected successfully");

    const server = app.listen(PORT, () => {
      console.log(`Management Ward start with: http://localhost:${PORT}`);
      console.log(
        `Management Ward Swagger start with: http://localhost:${PORT}/api-docs`,
      );
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

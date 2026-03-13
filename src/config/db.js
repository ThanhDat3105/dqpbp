const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const sslEnabled =
  process.env.DB_SSL === "true" || process.env.NODE_ENV === "production";

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
      },
);

module.exports = pool;

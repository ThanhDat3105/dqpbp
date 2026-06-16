const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const sslEnabled =
  process.env.DB_SSL === "true" || process.env.NODE_ENV === "production";

const shouldLogQueries =
  process.env.LOG_QUERIES === "true" ||
  (process.env.LOG_QUERIES !== "false" &&
    process.env.NODE_ENV !== "production");

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

function getSql(text) {
  return typeof text === "string" ? text.trim() : (text?.text ?? text);
}

function isUpdateQuery(sql) {
  return typeof sql === "string" && sql.toUpperCase().startsWith("UPDATE");
}

function wrapQuery(originalQuery) {
  return function loggableQuery(text, values, callback) {
    if (shouldLogQueries) {
      const sql = getSql(text);
      const isUpdate = isUpdateQuery(sql);

      if (isUpdate) {
        console.log("[SQL:UPDATE]", sql);
        if (values?.length) {
          console.log("[UPDATE:PARAMS]", values);
        }
      } else {
        console.log("[SQL]", sql);
        if (values?.length) {
          console.log("[PARAMS]", values);
        }
      }
    }

    return originalQuery(text, values, callback);
  };
}

function wrapClient(client) {
  if (!client || client.__queryWrapped) return client;

  client.query = wrapQuery(client.query.bind(client));
  client.__queryWrapped = true;
  return client;
}

const originalConnect = pool.connect.bind(pool);
pool.connect = function loggableConnect(...args) {
  const lastArg = args[args.length - 1];

  if (typeof lastArg === "function") {
    const callback = lastArg;
    const connectArgs = args.slice(0, -1);

    return originalConnect(...connectArgs, (err, client, release) => {
      if (!err && client) {
        wrapClient(client);
      }
      callback(err, client, release);
    });
  }

  return originalConnect(...args).then((client) => wrapClient(client));
};

module.exports = pool;

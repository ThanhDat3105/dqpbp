"use strict";

require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");

const { authLimiter } = require("./middlewares/rateLimiter");
const router = require("./routes/api");
// const routerAdmin = require("./routes/admin");

// const swagger = require("./configs/swagger/swagger");

const { cleanupFileOnError } = require("./middlewares/cleanupFile.middleware");

const app = express();

// SECURITY MIDDLEWARE
app.use(helmet());
app.use(hpp());

// BODY PARSER
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// STATIC FILES
app.use(express.static("."));

// LOGGER
app.use(morgan("dev"));

// GZIP COMPRESSION
app.use(compression());

// REMOVE EXPRESS HEADER
app.disable("x-powered-by");

// CORS CONFIG
const appOrigin = ["https://shop-basagi.cloud", "https://shop-basagi.com"];

if (process.env.NODE_ENV === "development") {
  appOrigin.push("http://localhost:3000");
  appOrigin.push("http://127.0.0.1:3000");
}

app.use(
  cors({
    origin: appOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// SWAGGER
// app.use("/api-docs", swagger.serve, swagger.setup);

// RATE LIMIT AUTH
app.use("/api/auth", authLimiter);

// ROUTES
app.use("/api", router);
// app.use("/admin", routerAdmin);

// 404 HANDLER
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

// CLEANUP FILES ON ERROR
app.use(cleanupFileOnError);

// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  const message = error.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    code: statusCode,
    message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
});

module.exports = app;

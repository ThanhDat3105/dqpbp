"use strict";

const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate");
const { authentication } = require("../middlewares/auth.middleware");
const { register, login, refreshToken } = require("../validations/auth.validation");

// POST /api/auth/register
router.post("/register", validate(register), authController.register);

// POST /api/auth/login  (authLimiter already applied in app.js at /api/auth)
router.post("/login", validate(login), authController.login);

// POST /api/auth/refresh  — exchange refresh token for new access token
router.post("/refresh", validate(refreshToken), authController.refreshToken);

// POST /api/auth/logout  — blacklist current access token
router.post("/logout", authentication, authController.logout);

module.exports = router;

"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const { NotFoundError, ForbiddenError } = require("../core/error.response");
const authService = require("../services/auth.service");
const { cleanupFile } = require("../middlewares/cleanupFile.middleware");

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    return new CREATED({
      message: "Account registered successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    return new SuccessResponse({
      message: "Login successful",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const data = await authService.refreshAccessToken(req.body.refresh_token);
    return new SuccessResponse({
      message: "Token refreshed",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Requires authentication middleware to be applied on the route
 */
const logout = async (req, res, next) => {
  try {
    const data = await authService.logout(req.token);
    return new SuccessResponse({
      message: "Logged out successfully",
      metaData: data,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's public profile.
 * Requires: authentication middleware (sets req.user)
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.user_id);

    // Middleware already confirmed is_active, but guard against race conditions
    if (!user) {
      return next(
        new ForbiddenError("Account not found or has been deactivated"),
      );
    }

    return new SuccessResponse({
      message: "User profile retrieved successfully",
      metaData: user,
    }).send(res);
  } catch (error) {
    next(error);
  }
};

const importExcel = async (req, res, next) => {
  try {
    const data = await authService.importUsersFromExcel(req.file?.path);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  } finally {
    if (req.file?.path) cleanupFile(req.file.path);
  }
};

module.exports = { register, login, refreshToken, logout, getMe, importExcel };

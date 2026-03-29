"use strict";

const { CREATED, SuccessResponse } = require("../core/success.response");
const authService = require("../services/auth.service");

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

module.exports = { register, login, refreshToken, logout };

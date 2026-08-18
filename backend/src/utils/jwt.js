"use strict";

const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || process.env.JWT_AT_KEY;
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_RT_KEY;

const ACCESS_TOKEN_EXPIRES = "7d";
const REFRESH_TOKEN_EXPIRES = "30d";

/**
 * Sign an access token
 * @param {{ user_id: number, email: string, role: string }} payload
 * @returns {string} signed JWT
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
};

/**
 * Sign a refresh token
 * @param {{ user_id: number }} payload
 * @returns {string} signed JWT
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });
};

/**
 * Verify an access token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

/**
 * Verify a refresh token
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};

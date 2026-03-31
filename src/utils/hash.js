"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto");

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a stored hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

module.exports = { hashPassword, comparePassword, hashToken };

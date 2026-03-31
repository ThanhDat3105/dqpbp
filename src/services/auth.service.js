"use strict";

const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const {
  ConflictRequestError,
  AuthFailureError,
  NotFoundError,
  BadRequestError,
} = require("../core/error.response");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Find a user by email (returns full row including password_hash)
 */
const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, role, team, is_active, last_login_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

/**
 * Strip sensitive fields before returning user to client
 */
const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  team: user.team,
  is_active: user.is_active,
});

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Register a new user
 */
const register = async ({ name, email, password, team, role, phone, address }) => {
  // 1. Check for duplicate email
  const existing = await findUserByEmail(email);

  if (existing) {
    throw new ConflictRequestError("Email is already registered");
  }

  // 2. Hash password
  const password_hash = await hashPassword(password);

  // 3. Insert user
  const { rows } = await pool.query(
    `INSERT INTO users
       (name, email, password_hash, team, role, phone, address,
        is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
     RETURNING id, name, email, role, team, is_active, created_at`,
    [name, email, password_hash, team, role, phone || null, address || null]
  );

  return { user: rows[0] };
};

/**
 * Login with email + password
 */
const login = async ({ email, password }) => {
  // 1. Lookup user -- use a generic error to prevent user enumeration
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AuthFailureError("Invalid credentials");
  }

  // 2. Check active status
  if (!user.is_active) {
    throw new AuthFailureError("Your account has been deactivated");
  }

  // 3. Verify password
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new AuthFailureError("Invalid credentials");
  }

  // 4. Build JWT payload (NEVER trust role from frontend)
  const payload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken({ user_id: user.id });

  // 5a. Update last_login_at
  await pool.query(
    `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [user.id]
  );

  // 5b. Persist refresh token (separate query — pg rejects multi-statement prepared statements)
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
    VALUES ($1, $2, 'refresh', false, NOW(), NOW() + INTERVAL '7 days')
    ON CONFLICT (token_hash) DO NOTHING`,
    [user.id, refresh_token]
  );

  return {
    token: {
      access_token,
      refresh_token,
    },
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      team: user.team,
    },
  };
};

/**
 * Refresh access token using a valid refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  // 1. Verify signature
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthFailureError("Invalid or expired refresh token");
  }

  // 2. Check it is not revoked
  const { rows: blacklistRows } = await pool.query(
    `SELECT id FROM tokens
     WHERE token = $1 AND type = 'refresh' AND revoked = true
     LIMIT 1`,
    [refreshToken]
  );
  if (blacklistRows.length > 0) {
    throw new AuthFailureError("Refresh token has been revoked");
  }

  // 3. Load fresh user data (role might have changed)
  const { rows } = await pool.query(
    `SELECT id, email, role, is_active FROM users WHERE id = $1 LIMIT 1`,
    [decoded.user_id]
  );
  const user = rows[0];
  if (!user || !user.is_active) {
    throw new AuthFailureError("Account not found or deactivated");
  }

  // 4. Issue new access token
  const access_token = signAccessToken({
    user_id: user.id,
    email: user.email,
    role: user.role,
  });

  return { access_token };
};

/**
 * Logout — blacklist the access and/or refresh token
 */
const logout = async (token) => {
  await pool.query(
    `UPDATE tokens SET revoked = true, updated_at = NOW()
     WHERE token = $1`,
    [token]
  );

  // Also insert if not already present (handles access-token blacklist)
  await pool.query(
    `INSERT INTO tokens (token, type, revoked, created_at)
     VALUES ($1, 'access', true, NOW())
     ON CONFLICT DO NOTHING`,
    [token]
  );

  return { message: "Logged out successfully" };
};

module.exports = { register, login, refreshAccessToken, logout };

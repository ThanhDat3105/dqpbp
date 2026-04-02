"use strict";

const pool = require("../config/db");
const { hashPassword, comparePassword, hashToken } = require("../utils/hash");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} = require("../utils/jwt");
const {
  ConflictRequestError,
  AuthFailureError,
  NotFoundError,
} = require("../core/error.response");

// ─── Helpers ─────────────────────────────────────────────────

const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, role, team, is_active
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
};

// ─── AUTH ────────────────────────────────────────────────────

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) throw new AuthFailureError("Invalid credentials");

  if (!user.is_active) {
    throw new AuthFailureError("Account deactivated");
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) throw new AuthFailureError("Invalid credentials");

  const payload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken({ user_id: user.id });

  // 🔥 HASH TOKEN
  const accessHash = hashToken(access_token);
  const refreshHash = hashToken(refresh_token);

  // 🔥 Lưu access token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', false, NOW(), NOW() + INTERVAL '1 hour')
     ON CONFLICT (token_hash)
     DO UPDATE SET 
       revoked = EXCLUDED.revoked,
       expires_at = EXCLUDED.expires_at`,
    [user.id, accessHash],
  );

  // 🔥 Lưu refresh token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'refresh', false, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (token_hash) DO NOTHING`,
    [user.id, refreshHash],
  );

  return {
    token: { access_token, refresh_token },
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      team: user.team,
    },
  };
};

// ─── REFRESH ─────────────────────────────────────────────────

const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthFailureError("Invalid or expired refresh token");
  }

  const userId = decoded.user_id;
  const refreshHash = hashToken(refreshToken);

  // 🔥 check refresh token
  const { rows } = await pool.query(
    `SELECT revoked FROM tokens
     WHERE token_hash = $1 AND type = 'refresh'
     LIMIT 1`,
    [refreshHash],
  );

  if (rows.length === 0) {
    throw new AuthFailureError("Refresh token not found");
  }

  if (rows[0].revoked) {
    throw new AuthFailureError("Refresh token revoked");
  }

  // 🔥 revoke refresh cũ
  await pool.query(`UPDATE tokens SET revoked = true WHERE token_hash = $1`, [
    refreshHash,
  ]);

  // 🔥 revoke ALL access token cũ
  await pool.query(
    `UPDATE tokens SET revoked = true 
     WHERE user_id = $1 AND type = 'access'`,
    [userId],
  );

  // load user
  const { rows: userRows } = await pool.query(
    `SELECT id, email, role, is_active 
     FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );

  const user = userRows[0];
  if (!user || !user.is_active) {
    throw new AuthFailureError("User invalid");
  }

  // 🔥 tạo token mới
  const newAccessToken = signAccessToken({
    user_id: user.id,
    email: user.email,
    role: user.role,
  });

  const newRefreshToken = signRefreshToken({
    user_id: user.id,
  });

  const accessHash = hashToken(newAccessToken);
  const newRefreshHash = hashToken(newRefreshToken);

  // 🔥 lưu access mới
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', false, NOW(), NOW() + INTERVAL '1 hour')
     ON CONFLICT (token_hash) DO UPDATE SET revoked = false, expires_at = EXCLUDED.expires_at`,
    [user.id, accessHash],
  );

  // 🔥 lưu refresh mới
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'refresh', false, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (token_hash) DO NOTHING`,
    [user.id, newRefreshHash],
  );

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  };
};

// ─── LOGOUT ─────────────────────────────────────────────────

const logout = async (token) => {
  let userId = null;
  let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7d

  try {
    const decoded = verifyAccessToken(token);
    userId = decoded.user_id;
    expiresAt = new Date(decoded.exp * 1000);
  } catch {
    // Token expired or invalid — still blacklist it by hash
    const jwtLib = require("jsonwebtoken");
    const raw = jwtLib.decode(token);
    if (raw) {
      userId = raw.user_id;
      expiresAt = raw.exp ? new Date(raw.exp * 1000) : expiresAt;
    }
  }

  const tokenHash = hashToken(token);

  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', true, NOW(), $3)
     ON CONFLICT (token_hash)
     DO UPDATE SET revoked = true`,
    [userId, tokenHash, expiresAt],
  );

  return { message: "Logged out successfully" };
};

// ─── GET ME ─────────────────────────────────────────────────

const getMe = async (userId) => {
  const { rows } = await pool.query(
    `SELECT id, name, role, team
     FROM users
     WHERE id = $1 AND is_active = true
     LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
};

const register = async ({
  name,
  email,
  password,
  team,
  role,
  phone,
  address,
}) => {
  // 1. Check email đã tồn tại chưa
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ConflictRequestError("Email already exists");
  }

  // 2. Hash password
  const passwordHash = await hashPassword(password);

  // 3. Insert user
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, team, phone, address, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
     RETURNING id, name, email, role, team`,
    [name, email, passwordHash, role, team, phone || null, address || null],
  );

  const user = rows[0];

  // 4. Tạo token giống login
  const payload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken({ user_id: user.id });

  // 5. Hash token
  const accessHash = hashToken(access_token);
  const refreshHash = hashToken(refresh_token);

  // 6. Lưu access token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', false, NOW(), NOW() + INTERVAL '1 hour')
     ON CONFLICT (token_hash)
     DO UPDATE SET revoked = false, expires_at = EXCLUDED.expires_at`,
    [user.id, accessHash],
  );

  // 7. Lưu refresh token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'refresh', false, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (token_hash) DO NOTHING`,
    [user.id, refreshHash],
  );

  // 8. Return giống login
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

module.exports = {
  login,
  refreshAccessToken,
  logout,
  getMe,
  register,
};

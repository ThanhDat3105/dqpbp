"use strict";

const pool = require("../config/db");
const { verifyAccessToken } = require("../utils/jwt");
const { AuthFailureError, NotFoundError } = require("../core/error.response");
const crypto = require("crypto");

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const authentication = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AuthFailureError("Authorization required"));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(new AuthFailureError("Token missing"));
    }

    // 1. Verify JWT
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new AuthFailureError("Token expired"));
      }
      return next(new AuthFailureError("Invalid token"));
    }

    // ❗ OPTIONAL (chỉ dùng nếu bạn lưu access token vào DB)
    // Nếu KHÔNG lưu access token → BỎ đoạn này cho nhẹ hệ thống
    /*
    const token_hash = hashToken(token);

    const { rows: tokenRows } = await pool.query(
      `SELECT id FROM tokens
       WHERE token_hash = $1
       AND revoked = true
       AND type = 'access'
       LIMIT 1`,
      [token_hash]
    );

    if (tokenRows.length > 0) {
      return next(new AuthFailureError("Token has been revoked"));
    }
    */

    // 2. Load user từ DB (KHÔNG trust JWT role)
    const { rows } = await pool.query(
      `SELECT id, email, role, team, is_active 
       FROM users 
       WHERE id = $1 
       LIMIT 1`,
      [decoded.user_id]
    );

    const user = rows[0];

    if (!user) {
      return next(new NotFoundError("User not found"));
    }

    if (!user.is_active) {
      return next(new AuthFailureError("Account deactivated"));
    }

    // 3. Attach user
    req.user = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      team: user.team,
    };

    req.token = token;

    return next();
  } catch (error) {
    console.log(error, "auth_error");
    return next(new AuthFailureError("Authentication failed"));
  }
};

module.exports = { authentication };
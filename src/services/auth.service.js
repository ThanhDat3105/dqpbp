const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const {
  ConflictRequestError,
  AuthFailureError,
  NotFoundError,
} = require("../core/error.response");

/**
 * ===============================
 * CREATE TOKEN
 * ===============================
 */
const createToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_AT_KEY || "JWT_AT_KEY", {
    expiresIn: "1d",
  });
};

/**
 * ===============================
 * SIGNUP
 * ===============================
 */
const signup = async (userData) => {
  const { username, password, email } = userData;

  const cleanUsername = username.trim();

  // check username
  const checkUser = await pool.query(
    "SELECT id FROM users WHERE username = $1",
    [cleanUsername],
  );

  if (checkUser.rows.length > 0) {
    throw new ConflictRequestError("Username already exists");
  }

  // check email
  if (email) {
    const checkEmail = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (checkEmail.rows.length > 0) {
      throw new ConflictRequestError("Email already exists");
    }
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // insert user
  const result = await pool.query(
    `
    INSERT INTO users (
      username,
      password,
      email,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,NOW(),NOW())
    RETURNING id, username, email
    `,
    [cleanUsername, hashedPassword, email || null],
  );

  const user = result.rows[0];

  const token = createToken({
    id: user.id,
    username: user.username,
  });

  return {
    user,
    token,
  };
};

/**
 * ===============================
 * LOGIN
 * ===============================
 */
const login = async (username, password) => {
  const cleanUsername = username.trim();

  const result = await pool.query("SELECT * FROM users WHERE username = $1", [
    cleanUsername,
  ]);

  if (result.rows.length === 0) {
    throw new NotFoundError("User not found");
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AuthFailureError("Invalid password");
  }

  const token = createToken({
    id: user.id,
    username: user.username,
  });

  delete user.password;

  return {
    user,
    token,
  };
};

/**
 * ===============================
 * VERIFY TOKEN
 * ===============================
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_AT_KEY || "JWT_AT_KEY");
  } catch (err) {
    throw new AuthFailureError("Invalid token");
  }
};

module.exports = {
  signup,
  login,
  verifyToken,
};

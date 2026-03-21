const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { AuthFailureError, NotFoundError } = require("../core/error.response");

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

    const decoded = jwt.verify(token, process.env.JWT_AT_KEY);

    const blacklistedResult = await pool.query(
      `SELECT id FROM tokens 
       WHERE token = $1 
       AND type = 'access' 
       AND blacklisted = true 
       LIMIT 1`,
      [token],
    );

    if (blacklistedResult.rows.length > 0) {
      return next(new AuthFailureError("Token has been revoked"));
    }

    const userResult = await pool.query(
      `SELECT * FROM users WHERE ref_id = $1 LIMIT 1`,
      [decoded.refId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return next(new NotFoundError("User not found"));
    }

    req.user = user;
    req.token = token;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AuthFailureError("Token expired"));
    }

    return next(new AuthFailureError("Invalid token"));
  }
};

module.exports = { authentication };

"use strict";

const { ForbiddenError, AuthFailureError } = require("../core/error.response");

/**
 * Role-based authorization middleware.
 * Must be used AFTER the authentication middleware.
 *
 * @param {string[]} allowedRoles - e.g. ["COMMANDER"]
 * @returns {function} Express middleware
 *
 * @example
 * router.get("/admin-only", authentication, requireRole(["COMMANDER"]), handler)
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    // Guard: authentication middleware must run first
    if (!req.user) {
      return next(new AuthFailureError("Authentication required"));
    }

    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role(s): ${allowedRoles.join(", ")}`
        )
      );
    }

    return next();
  };
};

module.exports = { requireRole };

const express = require("express");
const AuthController = require("../../../controllers/auth.controller");
const validate = require("../../../middlewares/validate");
const { userValidation } = require("../../../validations");
const { authentication } = require("../../../middlewares/auth.middleware");

const router = express.Router();

// Auth routes
router.post(
  "/register",
  validate(userValidation.signup),
  AuthController.signup,
);
router.post("/login", validate(userValidation.login), AuthController.login);
router.post("/logout", authentication, AuthController.logout);
router.post(
  "/refresh-token",
  validate(userValidation.refreshToken),
  AuthController.refreshToken,
);

module.exports = router;

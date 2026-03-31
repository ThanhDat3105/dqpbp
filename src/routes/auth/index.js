const express = require("express");
const AuthController = require("../../controllers/auth.controller");
const validate = require("../../middlewares/validate");
const { authValidation } = require("../../validations");
const { authentication } = require("../../middlewares/auth.middleware");

const router = express.Router();

// Auth routes
router.post(
  "/register",
  validate(authValidation.register),
  AuthController.register,
);
router.post("/login", validate(authValidation.login), AuthController.login);
router.post("/logout", authentication, AuthController.logout);
router.post(
  "/refresh-token",
  validate(authValidation.refreshToken),
  AuthController.refreshToken,
);
router.get("/me", authentication, AuthController.getMe);

module.exports = router;

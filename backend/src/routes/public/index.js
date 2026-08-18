"use strict";

const express = require("express");
const registrationController = require("../../controllers/registration.controller");
const validate = require("../../middlewares/validate");
const registrationValidation = require("../../validations/registration.validation");
const { registrationLimiter } = require("../../middlewares/rateLimiter");
const { authentication } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");

const router = express.Router();
const registrationManagerRoles = ["DQTT", "CHI_HUY", "ADMIN"];

router.post(
  "/registrations",
  registrationLimiter,
  validate(registrationValidation.createRegistration),
  registrationController.create,
);

router.get(
  "/registrations",
  authentication,
  requireRole(registrationManagerRoles),
  validate(registrationValidation.listRegistrations),
  registrationController.list,
);

router.get(
  "/registration-templates",
  validate(registrationValidation.listTemplates),
  registrationController.listTemplates,
);

module.exports = router;

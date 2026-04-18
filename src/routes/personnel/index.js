"use strict";

const express = require("express");
const router = express.Router();

const controller = require("../../controllers/personnel.controller");
const { authentication } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate");
const {
  getPersonnelList,
  updateStatus,
} = require("../../validations/personnel.validation");

// ─── All routes require authentication ───────────────────────────────────────
router.use(authentication);

// GET /api/personnel/overview
// Role: CHI_HUY, ADMIN
router.get(
  "/overview",
  requireRole(["CHI_HUY",]),
  controller.getOverview,
);

// GET /api/personnel/by-department
// Role: CHI_HUY, TO_TRUONG, ADMIN
router.get(
  "/by-department",
  requireRole(["CHI_HUY", "TO_TRUONG",]),
  controller.getByDepartment,
);

// GET /api/personnel/status-breakdown
// Role: CHI_HUY, ADMIN
router.get(
  "/status-breakdown",
  requireRole(["CHI_HUY",]),
  controller.getStatusBreakdown,
);

// GET /api/personnel/list
// Role: All authenticated (TO_TRUONG scoped by service)
router.get(
  "/list",
  validate(getPersonnelList),
  controller.getPersonnelList,
);

// PATCH /api/personnel/:id/status
// Role: CHI_HUY, TO_TRUONG, ADMIN
router.patch(
  "/:id/status",
  requireRole(["CHI_HUY", "TO_TRUONG",]),
  validate(updateStatus),
  controller.updateStatus,
);

module.exports = router;

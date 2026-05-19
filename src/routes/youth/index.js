"use strict";

const express = require("express");
const router = express.Router();

const controller = require("../../controllers/youth.controller");
const { authentication } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate");
const {
    getList,
    getById,
    create,
    update,
    remove,
} = require("../../validations/youth.validation");

// ─── All routes require authentication ───────────────────────────────────────
router.use(authentication);

// GET /api/youth/list
// Role: All authenticated
router.get("/list", validate(getList), controller.getList);

// GET /api/youth/:id
// Role: All authenticated
router.get("/:id", validate(getById), controller.getById);

// POST /api/youth
// Role: DQTT, CHI_HUY, ADMIN (Business Rule #4: DQCD không được phép)
router.post(
    "/",
    requireRole(["DQTT", "CHI_HUY", "ADMIN"]),
    validate(create),
    controller.create,
);

// PUT /api/youth/:id
// Role: DQTT, CHI_HUY, ADMIN
router.put(
    "/:id",
    requireRole(["DQTT", "CHI_HUY", "ADMIN"]),
    validate(update),
    controller.update,
);

// DELETE /api/youth/:id
// Role: CHI_HUY, ADMIN only (Business Rule #4)
router.delete(
    "/:id",
    requireRole(["CHI_HUY", "ADMIN"]),
    validate(remove),
    controller.remove,
);

// POST /api/youth/:id/to-nguon
// Role: DQTT, CHI_HUY, ADMIN
router.post(
    "/:id/to-nguon",
    requireRole(["DQTT", "CHI_HUY", "ADMIN"]),
    validate(getById),
    controller.promoteToNguon,
);

module.exports = router;

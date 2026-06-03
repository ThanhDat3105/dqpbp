"use strict";

const express = require("express");
const router = express.Router();

const controller = require("../../controllers/nguon.controller");
const { authentication } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");
const validate = require("../../middlewares/validate");
const {
  uploadExcel,
  handleMulterError,
} = require("../../config/multer.config");
const {
  getList,
  getById,
  create,
  update,
  remove,
} = require("../../validations/nguon.validation");

router.use(authentication);

// GET /api/nguon/list
router.get("/list", validate(getList), controller.getList);

// GET /api/nguon/:id
router.get("/:id", validate(getById), controller.getById);

// POST /api/nguon
router.post(
  "/import-excel",
  requireRole(["DQTT", "CHI_HUY", "ADMIN"]),
  uploadExcel.single("file"),
  handleMulterError,
  controller.importExcel,
);

// POST /api/nguon
router.post("/", requireRole(["DQTT", "CHI_HUY", "ADMIN"]), validate(create), controller.create);

// PUT /api/nguon/:id
router.put("/:id", requireRole(["DQTT", "CHI_HUY", "ADMIN"]), validate(update), controller.update);

// DELETE /api/nguon/:id
router.delete("/:id", requireRole(["CHI_HUY", "ADMIN"]), validate(remove), controller.remove);

module.exports = router;

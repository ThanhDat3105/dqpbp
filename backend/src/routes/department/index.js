"use strict";

const express = require("express");
const router = express.Router();

const departmentController = require("../../controllers/department.controller");
const { authentication } = require("../../middlewares/auth.middleware");
const { requireRole } = require("../../middlewares/role.middleware");

router.get("/", authentication, departmentController.getAll);
router.get("/:id", authentication, departmentController.getById);

router.post("/", authentication, requireRole(["ADMIN"]), departmentController.create);
router.put("/:id", authentication, requireRole(["ADMIN"]), departmentController.update);
router.delete("/:id", authentication, requireRole(["ADMIN"]), departmentController.remove);

module.exports = router;

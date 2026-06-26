"use strict";

const express = require("express");
const router = express.Router();

const kpiController = require("../../controllers/kpi.controller");
const { authentication } = require("../../middlewares/auth.middleware");

router.get("/summary", authentication, kpiController.getKpiSummary);
router.get("/departments", authentication, kpiController.getKpiDepartments);
router.get("/trend", authentication, kpiController.getKpiTrend);
router.get(
  "/hot-tasks/export",
  authentication,
  kpiController.exportKpiHotTasks,
);
router.get("/hot-tasks", authentication, kpiController.getKpiHotTasks);
router.get("/", authentication, kpiController.getKpi);

module.exports = router;

"use strict";

const express = require("express");
const router = express.Router();

const kpiController = require("../../controllers/kpi.controller");
const { authentication } = require("../../middlewares/auth.middleware");

router.get("/summary", authentication, kpiController.getKpiSummary);
router.get("/", authentication, kpiController.getKpi);

module.exports = router;

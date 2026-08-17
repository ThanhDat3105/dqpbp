"use strict";

const express = require("express");
const router = express.Router();

const controller = require("../../controllers/map-controller");
const neighborhoodController = require("../../controllers/map-neighborhood.controller");
const { authentication } = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate");
const { getNhanSu } = require("../../validations/map.validation");

router.use(authentication);

router.get("/nhan-su", validate(getNhanSu), controller.getNhanSu);
router.get("/khu-pho", neighborhoodController.getKhuPho);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('../../controllers/schedules.controller');
const { authentication } = require('../../middlewares/auth.middleware');

router.get('/', authentication, controller.getWeek);
router.put('/', authentication, controller.upsertWeek);

module.exports = router;

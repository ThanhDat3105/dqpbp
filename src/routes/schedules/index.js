// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/schedules.controller');
const { authentication } = require('../../middlewares/auth.middleware');

router.get('/', authentication, controller.getWeek);
router.post('/week', authentication, controller.createWeek);
router.patch('/day/:date', authentication, controller.updateDay);

module.exports = router;
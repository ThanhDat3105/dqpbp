'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../../controllers/user.controller');
const { authentication } = require('../../middlewares/auth.middleware');

// Public reads (for schedule dropdowns, etc.)
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Mutations — require auth
router.post('/', authentication, controller.create);
router.patch('/:id', authentication, controller.update);
router.patch('/:id/toggle-active', authentication, controller.toggleActive);
router.delete('/:id', authentication, controller.remove);

module.exports = router;

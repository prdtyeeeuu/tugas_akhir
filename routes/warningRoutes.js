const express = require('express');
const router = express.Router();
const warningController = require('../controllers/warningController');
const { requireAuth } = require('../middleware/auth');

router.post('/warnings/:id/acknowledge', requireAuth, warningController.acknowledgeWarning);

module.exports = router;

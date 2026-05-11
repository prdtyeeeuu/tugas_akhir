const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

router.post('/reports/jobs/:id', requireAuth, reportController.reportJob);
router.post('/reports/users/:id', requireAuth, reportController.reportUser);

module.exports = router;

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { requireHR } = require('../middleware/hrAuth');

router.post('/applications/:id/invite', requireHR, applicationController.inviteToInterview);
router.post('/applications/:id/reject', requireHR, applicationController.rejectApplication);

module.exports = router;

/**
 * Profile Structured Routes
 * Routing untuk structured profile management
 */
const express = require('express');
const router = express.Router();
const profileStructuredController = require('../controllers/profileStructuredController');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

// Semua route memerlukan auth
router.use(requireAuth);

// GET /profile/structured - Get complete structured profile
router.get('/structured', profileStructuredController.getCompleteProfile);

// Skills - New simple routes
router.post('/skills', profileController.addSkill);
router.delete('/skills/:id', profileController.removeSkill);

// Skills - Structured routes
router.post('/skills/add', profileStructuredController.addSkill);
router.put('/skills/:id', profileStructuredController.updateSkill);
router.delete('/skills/structured/:id', profileStructuredController.deleteSkill);

// Experiences
router.post('/experiences/add', profileStructuredController.addExperience);
router.put('/experiences/:id', profileStructuredController.updateExperience);
router.delete('/experiences/:id', profileStructuredController.deleteExperience);

// Educations
router.post('/educations/add', profileStructuredController.addEducation);
router.put('/educations/:id', profileStructuredController.updateEducation);
router.delete('/educations/:id', profileStructuredController.deleteEducation);

// Portfolios
router.post('/portfolios/add', profileStructuredController.addPortfolio);
router.put('/portfolios/:id', profileStructuredController.updatePortfolio);
router.delete('/portfolios/:id', profileStructuredController.deletePortfolio);

// Privacy Settings
router.post('/privacy/update', profileStructuredController.updatePrivacySettings);

module.exports = router;

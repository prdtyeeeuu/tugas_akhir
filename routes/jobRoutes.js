/**
 * Job Routes
 * Routing untuk dashboard, find jobs, dan aplikasi
 */
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /jobs - Find Jobs
router.get('/jobs', jobController.showFindJobs);

// GET /jobs/category/:category - Filter by category
router.get('/jobs/category/:category', jobController.showFindJobs);

// GET /jobs/:id - Detail lowongan (untuk applicant)
router.get('/jobs/:id', requireAuth, jobController.showJobDetail);

// GET /applications - Lamaran Saya (require auth)
router.get('/applications', requireAuth, jobController.showApplications);

// POST /jobs/apply/:id - Lamar pekerjaan (require auth)
router.post('/jobs/apply/:id', requireAuth, upload.cvImage.single('cv_image'), jobController.applyJob);

// POST /applications/cancel/:id - Tarik lamaran (require auth)
router.post('/applications/cancel/:id', requireAuth, jobController.cancelApplication);

module.exports = router;

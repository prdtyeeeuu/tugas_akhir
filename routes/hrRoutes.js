/**
 * HR Routes
 * Routing untuk semua halaman dan aksi HR
 */
const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrController');
const { requireHR } = require('../middleware/hrAuth');

// Semua route HR harus login sebagai HR
router.use(requireHR);

// GET /hr/dashboard - Dashboard HR
router.get('/dashboard', hrController.showDashboard);

// GET /hr/jobs - Kelola lowongan
router.get('/jobs', hrController.showManageJobs);

// GET /hr/jobs/create - Form buat lowongan baru
router.get('/jobs/create', hrController.showCreateJob);

// POST /hr/jobs - Simpan lowongan baru
router.post('/jobs', hrController.createJob);

// GET /hr/jobs/:id - Detail lowongan dengan pelamar
router.get('/jobs/:id', hrController.showJobDetail);

// PUT /hr/applications/:id - Update status lamaran
router.put('/applications/:id', hrController.updateApplicationStatus);

// DELETE /hr/jobs/:id - Hapus lowongan
router.delete('/jobs/:id', hrController.deleteJob);

module.exports = router;

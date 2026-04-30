/**
 * HR Routes
 * Routing untuk semua halaman dan aksi HR
 */
const express = require('express');
const router = express.Router();
const { companyLogo, offeringDoc } = require('../middleware/upload');
const hrController = require('../controllers/hrController');
const { requireHR } = require('../middleware/hrAuth');

// Semua route HR harus login sebagai HR
router.use(requireHR);

// GET /hr/home - Homepage khusus HR
router.get('/home', hrController.showHomeHR);

// GET /hr/dashboard - Dashboard HR
router.get('/dashboard', hrController.showDashboard);

// GET /hr/jobs - Kelola lowongan
router.get('/jobs', hrController.showManageJobs);

// GET /hr/jobs/create - Form buat lowongan baru
router.get('/jobs/create', hrController.showCreateJob);

// POST /hr/jobs - Simpan lowongan baru
router.post('/jobs', companyLogo.single('company_logo'), hrController.createJob);

// GET /hr/jobs/:id - Detail lowongan dengan pelamar
router.get('/jobs/:id', hrController.showJobDetail);

// GET /hr/interviews - Daftar kandidat yang dijadwalkan interview
router.get('/interviews', hrController.showInterviews);

// POST /hr/applications/:id - Update status lamaran
router.post('/applications/:id', hrController.updateApplicationStatus);

// POST /hr/applications/:id/offering - Kirim Offering Letter
router.post('/applications/:id/offering', offeringDoc.single('offering_document'), hrController.sendOffering);

// POST /hr/applications/:id/mark-cv-viewed - Tandai CV sebagai sudah dilihat
router.post('/applications/:id/mark-cv-viewed', hrController.markCvViewed);

// DELETE /hr/jobs/:id - Hapus lowongan
router.delete('/jobs/:id', hrController.deleteJob);

module.exports = router;

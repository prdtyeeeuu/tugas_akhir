/**
 * HR Routes
 * Routing untuk semua halaman dan aksi HR
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const hrController = require('../controllers/hrController');
const { requireHR } = require('../middleware/hrAuth');

// Configure multer for company logo upload
const companyLogoUploadDir = path.join(__dirname, '../public/images/companies');

// Ensure directory exists
if (!fs.existsSync(companyLogoUploadDir)) {
  fs.mkdirSync(companyLogoUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, companyLogoUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: fileFilter
});

// Semua route HR harus login sebagai HR
router.use(requireHR);

// GET /hr/home - Homepage khusus HR
router.get('/home', hrController.showHomeHR);

// GET /hr/dashboard - Dashboard HR (tetap asli)
router.get('/dashboard', hrController.showDashboard);

// GET /hr/jobs - Kelola lowongan
router.get('/jobs', hrController.showManageJobs);

// GET /hr/jobs/create - Form buat lowongan baru
router.get('/jobs/create', hrController.showCreateJob);

// POST /hr/jobs - Simpan lowongan baru
router.post('/jobs', upload.single('company_logo'), hrController.createJob);

// GET /hr/jobs/:id - Detail lowongan dengan pelamar
router.get('/jobs/:id', hrController.showJobDetail);

// PUT /hr/applications/:id - Update status lamaran
router.put('/applications/:id', hrController.updateApplicationStatus);

// DELETE /hr/jobs/:id - Hapus lowongan
router.delete('/jobs/:id', hrController.deleteJob);

module.exports = router;

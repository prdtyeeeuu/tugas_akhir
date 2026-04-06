/**
 * Profile Routes
 * Routing untuk melihat dan mengedit profil
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

// Absolute paths untuk upload directory
const profileUploadDir = path.join(__dirname, '../public/images/profiles');
const bannerUploadDir = path.join(__dirname, '../public/images/banners');

// Pastikan folder ada
[profileUploadDir, bannerUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Konfigurasi multer untuk upload gambar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Tentukan folder berdasarkan field name
    const uploadPath = file.fieldname === 'profileImage' ? profileUploadDir : bannerUploadDir;
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate nama unik: timestamp + random + extension
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// Filter file yang diupload
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: fileFilter
});

// Semua route profile memerlukan auth
router.use(requireAuth);

// GET /profile - Tampilkan halaman profil
router.get('/profile', profileController.showProfile);

// POST /profile/update - Update data profil
router.post('/profile/update', profileController.updateProfile);

// POST /profile/upload-image - Upload foto profil
router.post('/profile/upload-image', upload.single('profileImage'), profileController.uploadProfileImage);

// POST /profile/upload-banner - Upload banner
router.post('/profile/upload-banner', upload.single('bannerImage'), profileController.uploadBannerImage);

// POST /profile/remove-image - Hapus foto profil
router.post('/profile/remove-image', profileController.removeProfileImage);

// POST /profile/remove-banner - Hapus banner
router.post('/profile/remove-banner', profileController.removeBannerImage);

// POST /profile/set-banner-color - Set banner color
router.post('/profile/set-banner-color', profileController.setBannerColor);

module.exports = router;

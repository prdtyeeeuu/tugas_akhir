/**
 * Profile Structured Routes
 * Routing untuk structured profile management
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const profileStructuredController = require('../controllers/profileStructuredController');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

// Setup upload portfolio
const portfolioUploadDir = path.join(__dirname, '../public/images/portfolios');
if (!fs.existsSync(portfolioUploadDir)) {
  fs.mkdirSync(portfolioUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, portfolioUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

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

const uploadPortfolio = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: fileFilter
});


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
router.post('/portfolios/add', uploadPortfolio.single('portfolioImage'), profileStructuredController.addPortfolio);
router.put('/portfolios/:id', uploadPortfolio.single('portfolioImage'), profileStructuredController.updatePortfolio);
router.delete('/portfolios/:id', profileStructuredController.deletePortfolio);

// Privacy Settings
router.post('/privacy/update', profileStructuredController.updatePrivacySettings);

module.exports = router;

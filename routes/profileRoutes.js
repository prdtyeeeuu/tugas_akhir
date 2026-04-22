/**
 * Profile Routes
 * Routing untuk melihat dan mengedit profil
 */
const express = require('express');
const router = express.Router();
const { profileImage, bannerImage } = require('../middleware/upload');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');

// GET /user/:id - View other user's public profile (NO AUTH REQUIRED - PUBLIC)
router.get('/user/:id', profileController.showUserProfile);

// Semua route profile memerlukan auth
router.use(requireAuth);

// GET /profile - Tampilkan halaman profil
router.get('/profile', profileController.showProfile);

// POST /profile/update - Update data profil dasar (legacy)
router.post('/profile/update', profileController.updateProfile);

// POST /profile/update-details - Update data profil lengkap (address, gaji, dsb)
router.post('/profile/update-details', profileController.updateProfileDetails);

// POST /profile/upload-image - Upload foto profil
router.post('/profile/upload-image', profileImage.single('profileImage'), profileController.uploadProfileImage);

// POST /profile/upload-banner - Upload banner
router.post('/profile/upload-banner', bannerImage.single('bannerImage'), profileController.uploadBannerImage);

// POST /profile/remove-image - Hapus foto profil
router.post('/profile/remove-image', profileController.removeProfileImage);

// POST /profile/remove-banner - Hapus banner
router.post('/profile/remove-banner', profileController.removeBannerImage);

// POST /profile/set-banner-color - Set banner color
router.post('/profile/set-banner-color', profileController.setBannerColor);

// Skills
router.post('/profile/skills/add', profileController.addSkill);
router.delete('/profile/skills/remove/:id', profileController.removeSkill);

// Experiences
router.post('/profile/experiences/add', profileController.addExperience);
router.delete('/profile/experiences/remove/:id', profileController.deleteExperience);

// Educations
router.post('/profile/educations/add', profileController.addEducation);
router.delete('/profile/educations/remove/:id', profileController.deleteEducation);

module.exports = router;

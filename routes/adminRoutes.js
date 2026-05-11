const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');
const { companyLogo } = require('../middleware/upload');

// Apply requireAdmin middleware to all routes in this router
router.use(requireAdmin);

// Set admin layout
router.use((req, res, next) => {
  res.locals.layout = 'layouts/admin';
  next();
});

// Dashboard
router.get('/dashboard', adminController.showDashboard);

// Reports
router.get('/reports', adminController.showReports);
router.post('/reports/:id/status', adminController.updateReportStatus);
router.post('/reports/:id/action', adminController.actionReport);

// Users Management
router.get('/users', adminController.showUsers);
router.get('/users/new', adminController.showCreateUser);
router.post('/users', adminController.createUser);
router.get('/users/:id/edit', adminController.showEditUser);
router.post('/users/:id/edit', adminController.updateUser);
router.post('/users/:id/warn', adminController.warnUser);
router.post('/users/:id/suspend', adminController.suspendUser);
router.delete('/users/:id', adminController.deleteUser);

// Jobs Management
router.get('/jobs', adminController.showJobs);
router.get('/jobs/new', adminController.showCreateJob);
router.post('/jobs', companyLogo.single('company_logo'), adminController.createJob);
router.get('/jobs/:id/edit', adminController.showEditJob);
router.post('/jobs/:id/edit', companyLogo.single('company_logo'), adminController.updateJob);
router.post('/jobs/:id/suspend', adminController.suspendJob);
router.delete('/jobs/:id', adminController.deleteJob);

// Images Management
router.get('/images', adminController.showImages);
router.delete('/images/:category/:filename', adminController.deleteImage);

module.exports = router;

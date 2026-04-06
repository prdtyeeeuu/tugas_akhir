/**
 * Authentication Routes
 * Routing untuk login, register, dan logout
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');

// GET /login - Tampilkan halaman login
router.get('/login', redirectIfAuthenticated, authController.showLoginPage);

// POST /login - Proses login
router.post('/login', redirectIfAuthenticated, authController.login);

// GET /register - Tampilkan halaman register
router.get('/register', redirectIfAuthenticated, authController.showRegisterPage);

// POST /register - Proses register
router.post('/register', redirectIfAuthenticated, authController.register);

// GET /logout - Logout
router.get('/logout', authController.logout);

module.exports = router;

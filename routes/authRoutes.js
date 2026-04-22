/**
 * Authentication Routes
 * Routing untuk login, register, dan logout
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { limiters } = require('../middleware/rateLimiter');

// GET /login - Tampilkan halaman login
router.get('/login', redirectIfAuthenticated, authController.showLoginPage);

// POST /login - Proses login (with rate limiting)
router.post('/login', limiters.login, redirectIfAuthenticated, authController.login);

// GET /register - Tampilkan halaman register
router.get('/register', redirectIfAuthenticated, authController.showRegisterPage);

// POST /register - Proses register (with rate limiting)
router.post('/register', limiters.auth, redirectIfAuthenticated, authController.register);

// POST /logout - Logout (changed from GET to POST for CSRF protection)
router.post('/logout', authController.logout);

module.exports = router;

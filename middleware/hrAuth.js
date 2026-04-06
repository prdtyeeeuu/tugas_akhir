/**
 * HR Authentication Middleware
 * Middleware untuk memverifikasi user adalah HR
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'lokerin-secret-key-2024';

/**
 * Middleware untuk memastikan user adalah HR
 * Harus digunakan setelah requireAuth
 */
const requireHR = (req, res, next) => {
  // Cek token dari session
  const token = req.session?.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Cek apakah user adalah HR
    if (decoded.role !== 'hr') {
      return res.redirect('/'); // Bukan HR, redirect ke dashboard job seeker
    }

    next();
  } catch (error) {
    req.session.token = null;
    return res.redirect('/login');
  }
};

/**
 * Middleware untuk memastikan user adalah job seeker
 * Harus digunakan setelah requireAuth
 */
const requireJobSeeker = (req, res, next) => {
  const token = req.session?.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    if (decoded.role !== 'job_seeker') {
      return res.redirect('/hr/dashboard'); // Bukan job seeker, redirect ke dashboard HR
    }

    next();
  } catch (error) {
    req.session.token = null;
    return res.redirect('/login');
  }
};

module.exports = {
  requireHR,
  requireJobSeeker
};

/**
 * HR Authentication Middleware
 * Middleware untuk memverifikasi user adalah HR
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Middleware untuk memastikan user adalah HR
 */
const requireHR = (req, res, next) => {
  const token = req.session?.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    if (decoded.role !== 'hr') {
      return res.redirect('/');
    }

    next();
  } catch (error) {
    req.session.token = null;
    return res.redirect('/login');
  }
};

/**
 * Middleware untuk memastikan user adalah job seeker
 */
const requireJobSeeker = (req, res, next) => {
  const token = req.session?.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    if (decoded.role !== 'job_seeker') {
      return res.redirect('/hr/dashboard');
    }

    next();
  } catch (error) {
    req.session.token = null;
    return res.redirect('/login');
  }
};

module.exports = { requireHR, requireJobSeeker };

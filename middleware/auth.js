/**
 * Authentication Middleware
 * Middleware untuk proteksi halaman dan verifikasi JWT token
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { validateReturnUrl } = require('../utils/helpers');
const User = require('../models/User');

/**
 * Middleware untuk memverifikasi JWT token dari session
 * Mengecek apakah user sudah login
 */
const requireAuth = (req, res, next) => {
  const token = req.session?.token;

  if (!token) {
    const returnUrl = validateReturnUrl(req.originalUrl);
    return res.redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    if (!decoded.role) {
      req.session.token = null;
      return res.redirect('/login');
    }

    const allowedForHR = ['/', '/profile', '/chat'];
    const isAllowed = allowedForHR.some(p => req.path === p || req.path.startsWith(p + '/') || req.path.startsWith('/hr/'));
    if (decoded.role === 'hr' && !isAllowed) {
      return res.redirect('/hr/home');
    }

    next();
  } catch (error) {
    req.session.token = null;
    return res.redirect('/login');
  }
};

/**
 * Middleware untuk mengecek apakah user SUDAH login
 * Digunakan untuk halaman login/register (jika sudah login, redirect ke dashboard)
 */
const redirectIfAuthenticated = (req, res, next) => {
  const token = req.session?.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded.role === 'hr') {
        return res.redirect('/hr/home');
      }
      return res.redirect('/');
    } catch (error) {
      req.session.token = null;
    }
  }

  next();
};

/**
 * Generate JWT token
 * @param {object} user - Data user
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, profile_image: user.profile_image },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY }
  );
};

/**
 * Middleware opsional - menambahkan user ke res.locals jika login
 * Tidak memaksa redirect jika tidak login
 */
const setLocalUser = async (req, res, next) => {
  res.locals.user = null;

  const token = req.session?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);

      if (!decoded.role && decoded.id) {
        try {
          const user = await User.findById(decoded.id);
          if (user && user.role) {
            const newToken = generateToken(user);
            req.session.token = newToken;
            res.locals.user = jwt.verify(newToken, config.JWT_SECRET);
          } else {
            res.locals.user = decoded;
          }
        } catch (err) {
          res.locals.user = decoded;
        }
        return next();
      }

      res.locals.user = decoded;
    } catch (error) {
      res.locals.user = null;
    }
  }

  next();
};

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  generateToken,
  setLocalUser,
  JWT_SECRET: config.JWT_SECRET
};

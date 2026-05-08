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
const requireAuth = async (req, res, next) => {
  const token = req.session?.token;

  if (!token) {
    const returnUrl = validateReturnUrl(req.originalUrl);
    return res.redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Check if user exists and is not suspended
    const user = await User.findById(decoded.id);
    if (!user || user.status === 'suspended') {
      req.session.token = null;
      return res.redirect('/login?error=' + encodeURIComponent('Akun Anda telah ditangguhkan.'));
    }

    req.user = user;

    if (!user.role) {
      req.session.token = null;
      return res.redirect('/login');
    }

    const allowedForHR = ['/', '/profile', '/chat'];
    const isAllowed = allowedForHR.some(p => req.path === p || req.path.startsWith(p + '/') || req.path.startsWith('/hr/'));
    if (decoded.role === 'hr' && !isAllowed) {
      return res.redirect('/hr/home');
    }

    if (user.role === 'admin' && !req.originalUrl.startsWith('/admin') && req.originalUrl.split('?')[0] !== '/profile') {
        return res.redirect('/admin/dashboard');
    }

    next();
  } catch (error) {
    req.session.token = null;
    return res.redirect('/login');
  }
};

/**
 * Middleware untuk memastikan user adalah admin
 */
const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).render('pages/error', {
        title: 'Forbidden',
        error: 'Anda tidak memiliki akses ke halaman ini.'
      });
    }
  });
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
      if (decoded.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
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
  res.locals.isLoggedIn = false;

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
            req.user = jwt.verify(newToken, config.JWT_SECRET);
            res.locals.user = req.user;
            res.locals.isLoggedIn = true;
          } else {
            req.user = decoded;
            res.locals.user = decoded;
            res.locals.isLoggedIn = true;
          }
        } catch (err) {
          req.user = decoded;
          res.locals.user = decoded;
          res.locals.isLoggedIn = true;
        }
        return next();
      }

      req.user = decoded;
      res.locals.user = decoded;
      res.locals.isLoggedIn = true;
    } catch (error) {
      req.user = null;
      res.locals.user = null;
      res.locals.isLoggedIn = false;
      req.session.token = null;
    }
  }

  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  redirectIfAuthenticated,
  generateToken,
  setLocalUser,
  JWT_SECRET: config.JWT_SECRET
};

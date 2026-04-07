/**
 * Authentication Middleware
 * Middleware untuk proteksi halaman dan verifikasi JWT token
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'lokerin-secret-key-2024';

/**
 * Middleware untuk memverifikasi JWT token dari session
 * Mengecek apakah user sudah login
 */
const requireAuth = (req, res, next) => {
  // Cek token dari session (bukan dari header Authorization)
  const token = req.session?.token;

  if (!token) {
    // Simpan URL yang ingin diakses untuk redirect setelah login
    const returnUrl = req.originalUrl;
    return res.redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  try {
    // Verifikasi token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Simpan data user ke request
    
    // Jika token tidak punya role, redirect ke login untuk refresh
    if (!decoded.role) {
      req.session.token = null;
      return res.redirect('/login');
    }
    
    // Jika user adalah HR dan mencoba akses job seeker routes (bukan / atau /hr/* atau shared routes), redirect
    const allowedForHR = ['/', '/profile', '/chat'];
    const isAllowed = allowedForHR.some(p => req.path === p || req.path.startsWith(p + '/') || req.path.startsWith('/hr/'));
    if (decoded.role === 'hr' && !isAllowed) {
      return res.redirect('/hr/home');
    }
    
    next();
  } catch (error) {
    // Token tidak valid atau expired
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
      const decoded = jwt.verify(token, JWT_SECRET);
      // Redirect berdasarkan role
      if (decoded.role === 'hr') {
        return res.redirect('/hr/home');
      }
      return res.redirect('/'); // User sudah login, redirect ke dashboard job seeker
    } catch (error) {
      // Token tidak valid, hapus session
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
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token berlaku 7 hari
  );
};

/**
 * Middleware opsional - menambahkan user ke res.locals jika login
 * Tidak memaksa redirect jika tidak login
 * Juga akan refresh token jika token lama tidak punya role
 */
const setLocalUser = (req, res, next) => {
  res.locals.user = null;

  const token = req.session?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Jika token tidak punya role (token lama), refresh token
      if (!decoded.role && decoded.id) {
        // Ambil user dari database untuk mendapatkan role
        const User = require('../models/User');
        User.findById(decoded.id).then(user => {
          if (user && user.role) {
            // Generate token baru dengan role
            const newToken = generateToken(user);
            req.session.token = newToken;
            res.locals.user = jwt.verify(newToken, JWT_SECRET);
          } else {
            res.locals.user = decoded;
          }
          next();
        }).catch(() => {
          res.locals.user = decoded;
          next();
        });
        return;
      }
      
      res.locals.user = decoded;
    } catch (error) {
      // Token tidak valid, abaikan
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
  JWT_SECRET
};

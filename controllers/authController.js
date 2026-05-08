/**
 * Authentication Controller
 * Menangani login, register, dan logout
 */
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { validateReturnUrl } = require('../utils/helpers');

/**
 * Menampilkan halaman login
 */
const showLoginPage = (req, res) => {
  const returnUrl = validateReturnUrl(req.query.returnUrl);
  res.render('pages/auth/login', {
    title: 'Login - Lokerin',
    returnUrl,
    req: req
  });
};

/**
 * Menampilkan halaman register
 */
const showRegisterPage = (req, res) => {
  res.render('pages/auth/register', {
    title: 'Register - Lokerin',
    req: req
  });
};

/**
 * Proses login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.render('pages/auth/login', {
        title: 'Login - Lokerin',
        error: 'Email dan password wajib diisi',
        req: req
      });
    }

    // Cari user berdasarkan email
    const user = await User.findByEmail(email);

    // Generic error message to prevent user enumeration
    if (!user) {
      return res.render('pages/auth/login', {
        title: 'Login - Lokerin',
        error: 'Email atau password salah',
        req: req
      });
    }

    // Verifikasi password
    const isPasswordValid = await User.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.render('pages/auth/login', {
        title: 'Login - Lokerin',
        error: 'Email atau password salah',
        req: req
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Simpan token ke session
    req.session.token = token;

    // Redirect berdasarkan role
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    if (user.role === 'hr') {
      return res.redirect('/hr/home');
    }

    // Redirect ke halaman yang dituju atau dashboard
    const returnUrl = validateReturnUrl(req.body.returnUrl);
    res.redirect(returnUrl);

  } catch (error) {
    console.error('Login error:', error);
    res.render('pages/auth/login', {
      title: 'Login - Lokerin',
      error: 'Terjadi kesalahan. Silakan coba lagi.',
      req: req
    });
  }
};

/**
 * Proses register user baru
 * Setelah register, otomatis login
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validasi input
    if (!name || !email || !password) {
      return res.render('pages/auth/register', {
        title: 'Register - Lokerin',
        error: 'Semua field wajib diisi',
        formData: { name, email, role },
        req: req
      });
    }

    // Validasi panjang password
    if (password.length < 6) {
      return res.render('pages/auth/register', {
        title: 'Register - Lokerin',
        error: 'Password minimal 6 karakter',
        formData: { name, email, role },
        req: req
      });
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('pages/auth/register', {
        title: 'Register - Lokerin',
        error: 'Format email tidak valid',
        formData: { name, email, role },
        req: req
      });
    }

    // Validasi role
    const validRoles = ['job_seeker', 'hr'];
    const userRole = validRoles.includes(role) ? role : 'job_seeker';

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.render('pages/auth/register', {
        title: 'Register - Lokerin',
        error: 'Email sudah terdaftar',
        formData: { name, email, role: userRole },
        req: req
      });
    }

    // Buat user baru dengan role
    const userId = await User.create({ name, email, password, role: userRole });

    // Otomatis login setelah register
    const newUser = await User.findById(userId);
    const token = generateToken(newUser);

    // Simpan token ke session
    req.session.token = token;

    // Redirect berdasarkan role
    if (userRole === 'hr') {
      return res.redirect('/hr/home');
    }

    res.redirect('/');

  } catch (error) {
    console.error('Register error:', error);
    res.render('pages/auth/register', {
      title: 'Register - Lokerin',
      error: 'Terjadi kesalahan. Silakan coba lagi.',
      formData: req.body,
      req: req
    });
  }
};

/**
 * Proses logout - Changed to POST for CSRF protection
 */
const logout = (req, res) => {
  req.session.token = null;
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
};

module.exports = {
  showLoginPage,
  showRegisterPage,
  login,
  register,
  logout
};

/**
 * Lokerin - Main Application Entry Point
 * Platform pencarian kerja yang menghubungkan pencari kerja dan HR
 *
 * Cara menjalankan:
 * 1. Pastikan MySQL sudah berjalan
 * 2. Copy .env.example ke .env dan sesuaikan konfigurasi
 * 3. Jalankan: node database/seed.js (untuk buat database & tabel)
 * 4. Jalankan: npm start
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const { startApplicationExpiryJob } = require('./jobs/applicationExpiryJob');

// Import middleware
const { setLocalUser, requireAuth } = require('./middleware/auth');
const csrfProtection = require('./middleware/csrf');
const { limiters } = require('./middleware/rateLimiter');

// Import models
const Chat = require('./models/Chat');

// Import controller
const jobController = require('./controllers/jobController');

// Import routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const profileRoutes = require('./routes/profileRoutes');
const chatRoutes = require('./routes/chatRoutes');
const profileStructuredRoutes = require('./routes/profileStructuredRoutes');
const hrRoutes = require('./routes/hrRoutes');
const apiRoutes = require('./routes/apiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const warningRoutes = require('./routes/warningRoutes');

// Inisialisasi Express app
const app = express();
const PORT = config.PORT;

// ======================================
// MIDDLEWARE SETUP
// ======================================

// Security headers (XSS protection, clickjacking, content-type sniffing, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // Disable for EJS compatibility
  crossOriginEmbedderPolicy: false
}));

// CORS - Restrict to configured origins
app.use(cors({
  origin: config.ALLOWED_ORIGINS,
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies (dari form)
app.use(express.urlencoded({ extended: true }));

// Method override for PUT/DELETE from form
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true jika menggunakan HTTPS
    httpOnly: true, // Prevent XSS access to cookie
    maxAge: config.SESSION_MAX_AGE, // 7 hari
    sameSite: 'lax' // CSRF protection via cookie
  },
  name: 'lokerin.sid' // Don't expose default session cookie name
}));

// CSRF Protection (must be after session)
app.use(csrfProtection);

// General rate limiting
app.use(limiters.general);

// Static files - Public folder
app.use(express.static(path.join(__dirname, 'public')));

// Set local variables untuk semua views
app.use(setLocalUser);

// Set unread chat count untuk semua views (jika user sudah login)
app.use(async (req, res, next) => {
  if (req.user && req.user.id) {
    try {
      const unreadCount = await Chat.getUnreadCount(req.user.id);
      res.locals.unreadCount = unreadCount;
    } catch (error) {
      res.locals.unreadCount = 0;
    }
  } else {
    res.locals.unreadCount = 0;
  }
  next();
});

// ======================================
// VIEW ENGINE SETUP
// ======================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Setup EJS Layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ======================================
// ROUTES
// ======================================

// Auth routes (login, register, logout) - with strict rate limiting
app.use(authRoutes);

// Home Route (Public)
app.get('/', jobController.showHome);

// Dashboard Route (Protected)
app.get('/dashboard', requireAuth, jobController.showDashboard);

// Job routes (find jobs, apply)
app.use(applicationRoutes);
app.use(reportRoutes);
app.use(warningRoutes);
app.use(jobRoutes);

// API routes
app.use('/api', apiRoutes);

// Profile routes (view, update, upload)
app.use(profileRoutes);

// Profile Structured routes (skills, experiences, etc)
app.use(profileStructuredRoutes);

// Chat routes (messaging) - with chat rate limiting
app.use('/chat', limiters.chat, chatRoutes);

// HR routes (dashboard, manage jobs, etc) - mounted at /hr
app.use('/hr', hrRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// ======================================
// ERROR HANDLING
// ======================================

// 404 Handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: '404 - Page Not Found',
    user: req.user || null
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).render('pages/error', {
      title: 'Error',
      error: 'Ukuran file terlalu besar. Maksimal 5MB'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).render('pages/error', {
      title: 'Error',
      error: 'File upload tidak valid'
    });
  }

  res.status(err.status || 500).render('pages/error', {
    title: 'Error',
    error: config.NODE_ENV === 'production'
      ? 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
      : err.message
  });
});

// ======================================
// START SERVER
// ======================================

startApplicationExpiryJob();

app.listen(PORT, () => {
  logger.info(`Lokerin server started`, { port: PORT, env: config.NODE_ENV });
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🚀  LOKERIN - Job Portal Platform         ║
║                                              ║
║   Server running on:                         ║
║   http://localhost:${PORT}                         ║
║                                              ║
║   Database: MySQL                            ║
║   Template Engine: EJS                       ║
║   Styling: Tailwind CSS                      ║
║   Security: Helmet + CSRF + Rate Limit       ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;

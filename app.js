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
const path = require('path');
require('dotenv').config();

// Import middleware
const { setLocalUser, requireAuth } = require('./middleware/auth');

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

// Inisialisasi Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ======================================
// MIDDLEWARE SETUP
// ======================================

// CORS - Mengizinkan cross-origin requests
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies (dari form)
app.use(express.urlencoded({ extended: true }));

// Method override untuk PUT/DELETE dari form
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'lokerin-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set true jika menggunakan HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari
  }
}));

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

// Set EJS sebagai template engine
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

// Auth routes (login, register, logout)
app.use(authRoutes);

// Home Route (Public)
app.get('/', jobController.showHome);

// Dashboard Route (Protected)
app.get('/dashboard', requireAuth, jobController.showDashboard);

// Job routes (find jobs, apply)
app.use(jobRoutes);

// Profile routes (view, update, upload)
app.use(profileRoutes);

// Profile Structured routes (skills, experiences, etc)
app.use(profileStructuredRoutes);

// Chat routes (messaging)
app.use(chatRoutes);

// HR routes (dashboard, manage jobs, etc) - mounted at /hr
app.use('/hr', hrRoutes);

// ======================================
// ERROR HANDLING
// ======================================

// 404 Handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: '404 - Page Not Found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).render('pages/error', {
      title: 'Error',
      error: 'Ukuran file terlalu besar. Maksimal 5MB'
    });
  }
  
  res.status(500).render('pages/error', {
    title: 'Error',
    error: process.env.NODE_ENV === 'production' 
      ? 'Terjadi kesalahan pada server' 
      : err.message
  });
});

// ======================================
// START SERVER
// ======================================

app.listen(PORT, () => {
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
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;

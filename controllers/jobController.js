/**
 * Job Controller
 * Menangani dashboard, find jobs, dan aplikasi lamaran
 */
const Job = require('../models/Job');
const Application = require('../models/Application');
const Profile = require('../models/Profile');

/**
 * Menampilkan halaman Home (Public)
 * Homepage untuk semua user (belum login atau sudah login)
 * Membedakan tampilan untuk HR dan Job Seeker
 */
const showHome = async (req, res) => {
  try {
    // Cek apakah user sudah login dan merupakan HR
    const token = req.session?.token;
    let isHR = false;
    
    if (token) {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'lokerin-secret-key-2024';
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'hr') {
          isHR = true;
        }
      } catch (e) {
        // Token tidak valid, abaikan
      }
    }

    // Jika user adalah HR, arahkan ke homepage HR
    if (isHR) {
      return res.redirect('/hr/home');
    }

    // Untuk job seeker dan guest, tampilkan homepage job seeker
    // Ambil job terbaru untuk rekomendasi (max 6)
    const recentJobs = await Job.findRecent(6);

    // Ambil semua kategori
    const categories = await Job.findCategories();

    res.render('pages/home', {
      title: 'Lokerin - Temukan Pekerjaan Impianmu',
      jobs: recentJobs,
      categories,
      formatSalary: function(amount) {
        if (!amount) return '';
        if (amount >= 1000000) {
          return (amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1) + ' jt';
        } else if (amount >= 1000) {
          return (amount / 1000).toFixed(0) + ' rb';
        }
        return amount.toString();
      },
      formatTimeAgo: function(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        const intervals = [
          { label: 'tahun', seconds: 31536000 },
          { label: 'bulan', seconds: 2592000 },
          { label: 'minggu', seconds: 604800 },
          { label: 'hari', seconds: 86400 },
          { label: 'jam', seconds: 3600 },
          { label: 'menit', seconds: 60 }
        ];

        for (const interval of intervals) {
          const count = Math.floor(seconds / interval.seconds);
          if (count >= 1) {
            if (interval.label === 'jam') {
              return count + ' jam lalu';
            } else if (interval.label === 'menit') {
              return count < 60 ? 'Baru Saja' : count + ' menit lalu';
            } else if (interval.label === 'hari') {
              if (count === 1) return '1 hari lalu';
              if (count < 7) return count + ' hari lalu';
            }
            break;
          }
        }

        if (seconds < 60) return 'Baru Saja';
        return Math.floor(seconds / 3600) + ' jam lalu';
      }
    });
  } catch (error) {
    console.error('Home error:', error);
    res.render('pages/home', {
      title: 'Lokerin - Temukan Pekerjaan Impianmu',
      jobs: [],
      categories: [],
      error: 'Gagal memuat data'
    });
  }
};

/**
 * Menampilkan halaman Dashboard (Private/Protected)
 * Hanya untuk job seekers, HR akan di-redirect ke /hr/dashboard
 */
const showDashboard = async (req, res) => {
  try {
    // Jika user adalah HR, redirect ke dashboard HR
    if (req.user && req.user.role === 'hr') {
      return res.redirect('/hr/dashboard');
    }

    // Ambil job terbaru untuk rekomendasi
    const jobs = await Job.findRecent(6);

    // Statistik dari Database (Real Data)
    const userId = req.user.id;
    const applications = await Application.findByUserId(userId);
    const appStats = await Application.getStats(userId);

    const stats = {
      applied: appStats.total,
      views: 0, // TODO: Implement profile views tracking
      interviews: appStats.interview,
      accepted: appStats.accepted,
      pending: appStats.pending,
      rejected: appStats.rejected
    };

    // Mock Activity Data
    const activity = [];
    if (applications.length > 0) {
      const lastApp = applications[0];
      activity.push({
        type: 'success',
        message: `Lamaran untuk ${lastApp.job_title} terkirim.`,
        time: formatTimeAgo(lastApp.applied_at)
      });
    } else {
      activity.push({
        type: 'info',
        message: 'Mulai cari pekerjaan dan lamar sekarang!',
        time: 'Baru saja'
      });
    }

    // Hitung kelengkapan profil dari DB
    let completeness = 0;
    try {
      completeness = await Profile.calculateCompleteness(userId);
    } catch(e) {
      // Fallback jika tabel belum ada
      completeness = 20;
      if (req.user.profile_image) completeness += 20;
      if (req.user.bio) completeness += 10;
    }

    res.render('pages/dashboard', {
      title: 'Dashboard - Lokerin',
      jobs,
      stats,
      activity,
      completeness
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('pages/dashboard', {
      title: 'Dashboard - Lokerin',
      jobs: [],
      stats: { applied: 0, views: 0, interviews: 0 },
      activity: [],
      error: 'Gagal memuat dashboard'
    });
  }
};

// Helper function moved here or kept in render
function formatTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  const intervals = [
    { label: 'tahun', seconds: 31536000 },
    { label: 'bulan', seconds: 2592000 },
    { label: 'hari', seconds: 86400 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return count + ' ' + interval.label + ' lalu';
  }
  return 'Baru saja';
}

/**
 * Menampilkan halaman find jobs
 * Jika user adalah HR, redirect ke /hr/dashboard
 */
const showFindJobs = async (req, res) => {
  try {
    // Cek jika user adalah HR, redirect ke dashboard HR
    const token = req.session?.token;
    if (token) {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'lokerin-secret-key-2024';
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'hr') {
          return res.redirect('/hr/dashboard');
        }
      } catch (e) {
        // Token tidak valid, abaikan dan tampilkan jobs biasa
      }
    }

    const { category, search } = req.query;

    // Build filter
    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;

    // Ambil semua jobs dengan filter
    const jobs = await Job.findAll(filters);

    // Ambil semua kategori untuk filter dropdown
    const categories = await Job.findCategories();

    res.render('pages/jobs', {
      title: 'Find Jobs - Lokerin',
      jobs,
      categories,
      selectedCategory: category,
      searchQuery: search,
      formatSalary: function(amount) {
        if (!amount) return '';
        if (amount >= 1000000) {
          return (amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1) + ' jt';
        } else if (amount >= 1000) {
          return (amount / 1000).toFixed(0) + ' rb';
        }
        return amount.toString();
      },
      formatTimeAgo: function(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        const intervals = [
          { label: 'tahun', seconds: 31536000 },
          { label: 'bulan', seconds: 2592000 },
          { label: 'minggu', seconds: 604800 },
          { label: 'hari', seconds: 86400 },
          { label: 'jam', seconds: 3600 },
          { label: 'menit', seconds: 60 }
        ];

        for (const interval of intervals) {
          const count = Math.floor(seconds / interval.seconds);
          if (count >= 1) {
            if (interval.label === 'jam') {
              return count + ' jam lalu';
            } else if (interval.label === 'menit') {
              return count < 60 ? 'Baru Saja' : count + ' menit lalu';
            } else if (interval.label === 'hari') {
              if (count === 1) return '1 hari lalu';
              if (count < 7) return count + ' hari lalu';
            }
            break;
          }
        }

        if (seconds < 60) return 'Baru Saja';
        return Math.floor(seconds / 3600) + ' jam lalu';
      }
    });
  } catch (error) {
    console.error('Find jobs error:', error);
    res.render('pages/jobs', {
      title: 'Find Jobs - Lokerin',
      jobs: [],
      categories: [],
      error: 'Gagal memuat data pekerjaan'
    });
  }
};

/**
 * Menampilkan halaman lamaran saya
 * Hanya untuk job seekers, HR akan di-redirect
 */
const showApplications = async (req, res) => {
  try {
    // Jika user adalah HR, redirect ke dashboard HR
    if (req.user && req.user.role === 'hr') {
      return res.redirect('/hr/dashboard');
    }

    const userId = req.user.id;

    // Ambil semua lamaran user
    const applications = await Application.findByUserId(userId);

    // Hitung statistik
    const stats = {
      total: applications.length,
      interview: applications.filter(app => app.status === 'interview').length,
      accepted: applications.filter(app => app.status === 'diterima').length,
      pending: applications.filter(app => app.status === 'pending').length,
      rejected: applications.filter(app => app.status === 'ditolak').length
    };

    res.render('pages/applications', {
      title: 'My Applications - Lokerin',
      applications,
      stats
    });
  } catch (error) {
    console.error('Applications error:', error);
    res.render('pages/applications', {
      title: 'My Applications - Lokerin',
      applications: [],
      stats: { total: 0, interview: 0, accepted: 0, pending: 0, rejected: 0 },
      error: 'Gagal memuat data lamaran'
    });
  }
};

/**
 * Proses melamar pekerjaan
 */
const applyJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;

    // Cek apakah job ada
    const job = await Job.findById(jobId);
    if (!job) {
      req.flash('error', 'Pekerjaan tidak ditemukan');
      return res.redirect('/jobs');
    }

    // Buat lamaran baru
    await Application.create({ user_id: userId, job_id: jobId });

    // Redirect ke halaman lamaran dengan pesan sukses
    res.redirect('/applications?success=true');

  } catch (error) {
    console.error('Apply job error:', error);
    
    if (error.message === 'Anda sudah melamar untuk pekerjaan ini') {
      return res.redirect('/jobs?already_applied=true');
    }

    req.flash('error', 'Gagal melamar pekerjaan');
    res.redirect('/jobs');
  }
};

/**
 * Menampilkan detail lowongan untuk applicant
 */
const showJobDetail = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).render('pages/404', {
        title: 'Lowongan Tidak Ditemukan'
      });
    }

    res.render('pages/job-detail', {
      title: `${job.title} - ${job.company}`,
      job,
      formatSalary: function(amount) {
        if (!amount) return '';
        if (amount >= 1000000) {
          return (amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1) + ' jt';
        } else if (amount >= 1000) {
          return (amount / 1000).toFixed(0) + ' rb';
        }
        return amount.toString();
      }
    });
  } catch (error) {
    console.error('Job detail error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: 'Terjadi kesalahan saat memuat detail lowongan'
    });
  }
};

/**
 * Menarik lamaran
 */
const cancelApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user.id;

    // Cek apakah lamaran ini milik user
    const applications = await Application.findByUserId(userId);
    const app = applications.find(a => a.id == applicationId);

    if (!app) {
      return res.status(404).json({ error: 'Lamaran tidak ditemukan' });
    }

    // Hanya bisa tarik lamaran yang statusnya pending atau interview
    if (app.status !== 'pending' && app.status !== 'interview') {
      return res.status(400).json({ error: 'Lamaran tidak dapat ditarik' });
    }

    // Hapus lamaran dari database
    const { query } = require('../config/db');
    await query('DELETE FROM applications WHERE id = ? AND user_id = ?', [applicationId, userId]);

    // Redirect kembali ke halaman lamaran
    res.redirect('/applications?cancelled=true');
  } catch (error) {
    console.error('Cancel application error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menarik lamaran' });
  }
};

module.exports = {
  showHome,
  showDashboard,
  showFindJobs,
  showApplications,
  applyJob,
  showJobDetail,
  cancelApplication
};

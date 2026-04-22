/**
 * Job Controller
 * Menangani dashboard, find jobs, dan aplikasi lamaran
 */
const Job = require('../models/Job');
const Application = require('../models/Application');
const Profile = require('../models/Profile');
const { formatSalary, formatTimeAgo } = require('../utils/helpers');
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Menampilkan halaman Home (Public)
 * Homepage untuk semua user (belum login atau sudah login)
 * Membedakan tampilan untuk HR dan Job Seeker
 */
const showHome = async (req, res) => {
  try {
    const token = req.session?.token;
    let isHR = false;
    let isLoggedIn = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        isLoggedIn = true;
        if (decoded.role === 'hr') {
          isHR = true;
        }
      } catch (e) {
        // Token tidak valid
      }
    }

    // Jika user adalah HR, arahkan ke homepage HR
    if (isHR) {
      return res.redirect('/hr/home');
    }

    // Untuk job seeker dan guest
    let recentJobs = [];
    let categories = [];

    // Hanya ambil jobs jika user sudah login
    if (isLoggedIn) {
      recentJobs = await Job.findRecent(6);
      categories = await Job.findCategories();
    }

    res.render('pages/home', {
      title: 'Lokerin - Temukan Pekerjaan Impianmu',
      jobs: recentJobs,
      categories,
      formatSalary,
      formatTimeAgo,
      isLoggedIn
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

    const appliedJobIds = applications.map(app => app.job_id);

    res.render('pages/dashboard', {
      title: 'Dashboard - Lokerin',
      jobs,
      stats,
      activity,
      completeness,
      appliedJobIds
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

/**
 * Menampilkan halaman find jobs
 */
const showFindJobs = async (req, res) => {
  try {
    const token = req.session?.token;
    let isLoggedIn = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        isLoggedIn = true;
        if (decoded.role === 'hr') {
          return res.redirect('/hr/dashboard');
        }
      } catch (e) {
        // Token tidak valid
      }
    }

    const { category, search } = req.query;
    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;

    let jobs = [];
    let categories = [];
    let pagination = null;

    let appliedJobIds = [];

    if (isLoggedIn) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await Job.findAll(filters, { page, limit });
      jobs = result.jobs;
      categories = await Job.findCategories();
      
      const token = req.session?.token;
      if (token) {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const userApplications = await require('../models/Application').findByUserId(decoded.id);
        appliedJobIds = userApplications.map(app => app.job_id);
      }

      pagination = {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      };
    } else {
      categories = await Job.findCategories();
    }

    res.render('pages/jobs', {
      title: 'Find Jobs - Lokerin',
      jobs,
      categories,
      selectedCategory: category,
      searchQuery: search,
      formatSalary,
      formatTimeAgo,
      isLoggedIn,
      pagination,
      appliedJobIds
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

    // Cek deadline
    if (job.deadline && new Date(job.deadline) < new Date()) {
      req.flash('error', 'Pekerjaan sudah ditutup');
      return res.redirect('/jobs');
    }

    // Buat lamaran baru
    const cv_image = req.file ? req.file.filename : null;
    if (!cv_image) {
      req.flash('error', 'CV berupa foto wajib dilampirkan');
      return res.redirect('/jobs');
    }
    
    await Application.create({ user_id: userId, job_id: jobId, cv_image });

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
        title: 'Lowongan Tidak Ditemukan',
        user: req.user || null
      });
    }

    res.render('pages/job-detail', {
      title: `${job.title} - ${job.company}`,
      job,
      formatSalary
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

    const applications = await Application.findByUserId(userId);
    const app = applications.find(a => a.id == applicationId);

    if (!app) {
      return res.redirect('/applications?error=Lamaran+tidak+ditemukan');
    }

    if (app.status !== 'pending' && app.status !== 'interview') {
      return res.redirect('/applications?error=Lamaran+tidak+dapat+ditarik');
    }

    await Application.cancel(applicationId, userId);
    res.redirect('/applications?cancelled=true');
  } catch (error) {
    console.error('Cancel application error:', error);
    res.redirect('/applications?error=Gagal+menarik+lamaran');
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

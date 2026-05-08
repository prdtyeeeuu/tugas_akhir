/**
 * Job Controller
 * Menangani dashboard, find jobs, dan aplikasi lamaran
 */
const Job = require('../models/Job');
const Application = require('../models/Application');
const Category = require('../models/Category');
const Profile = require('../models/Profile');
const { formatSalary, formatTimeAgo } = require('../utils/helpers');

function redirectWithError(res, path, message) {
  return res.redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function getRequestUser(req, res) {
  return req.user || res.locals.user || null;
}

function parseCategoryIds(value) {
  if (!value) {
    return [];
  }

  const rawIds = Array.isArray(value) ? value : String(value).split(',');
  const ids = rawIds
    .map(id => parseInt(id, 10))
    .filter(Number.isInteger);

  return [...new Set(ids)];
}

/**
 * Menampilkan halaman Home (Public)
 * Homepage untuk semua user (belum login atau sudah login)
 * Membedakan tampilan untuk HR dan Job Seeker
 */
const showHome = async (req, res) => {
  const currentUser = getRequestUser(req, res);

  try {
    const isLoggedIn = Boolean(currentUser);
    const isHR = currentUser?.role === 'hr';

    // Jika user adalah HR, arahkan ke homepage HR
    if (isHR) {
      return res.redirect('/hr/home');
    }

    // Fetch dynamic data for homepage (available for both guest and logged-in)
    const recentJobs = await Job.findRecent(6);
    const categories = await Job.findCategories();
    const stats = await Job.getGlobalStats();

    let appliedJobIds = [];
    if (isLoggedIn) {
      const userApplications = await Application.findByUserId(currentUser.id);
      appliedJobIds = userApplications.map(app => app.job_id);
    }

    res.render('pages/home', {
      title: 'Lokerin - Temukan Pekerjaan Impianmu',
      jobs: recentJobs,
      categories,
      stats,
      formatSalary,
      formatTimeAgo,
      isLoggedIn,
      appliedJobIds,
      user: currentUser
    });
  } catch (error) {
    console.error('Home error:', error);
    res.render('pages/home', {
      title: 'Lokerin - Temukan Pekerjaan Impianmu',
      jobs: [],
      categories: [],
      stats: { jobs: 0, companies: 0, workers: 0 },
      error: 'Gagal memuat data',
      isLoggedIn: Boolean(currentUser),
      appliedJobIds: []
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
  const { category, search } = req.query;
  const selectedCategoryIds = parseCategoryIds(req.query.categories);
  const currentUser = getRequestUser(req, res);
  const isLoggedIn = Boolean(currentUser);

  try {
    if (currentUser?.role === 'hr') {
      return res.redirect('/hr/dashboard');
    }

    const filters = {};
    if (category) filters.category = category;
    if (search) filters.search = search;

    let jobs = [];
    let categories = [];
    let selectedCategoryNames = [];
    let pagination = null;

    let appliedJobIds = [];

    if (isLoggedIn) {
      if (selectedCategoryIds.length > 0) {
        const selectedCategoryRows = await Category.findByIds(selectedCategoryIds);
        selectedCategoryNames = selectedCategoryRows.map(item => item.name);
        filters.categories = selectedCategoryNames;
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const result = await Job.findAll(filters, { page, limit });
      jobs = result.jobs;
      categories = await Job.findCategories();
      
      const userApplications = await require('../models/Application').findByUserId(currentUser.id);
      appliedJobIds = userApplications.map(app => app.job_id);

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
      selectedCategoryIds,
      selectedCategoryNames,
      searchQuery: search,
      formatSalary,
      formatTimeAgo,
      isLoggedIn,
      pagination,
      appliedJobIds,
      error: req.query.error,
      alreadyApplied: req.query.already_applied === 'true'
    });
  } catch (error) {
    console.error('Find jobs error:', error);
    res.render('pages/jobs', {
      title: 'Find Jobs - Lokerin',
      jobs: [],
      categories: [],
      error: req.query.error || 'Gagal memuat data pekerjaan',
      isLoggedIn,
      selectedCategory: category,
      selectedCategoryIds,
      selectedCategoryNames: [],
      searchQuery: search,
      formatSalary,
      formatTimeAgo,
      pagination: null,
      appliedJobIds: [],
      alreadyApplied: req.query.already_applied === 'true'
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
      return redirectWithError(res, '/jobs', 'Pekerjaan tidak ditemukan');
    }

    // Cek deadline
    if (job.deadline && new Date(job.deadline) < new Date()) {
      return redirectWithError(res, '/jobs', 'Pekerjaan sudah ditutup');
    }

    // Buat lamaran baru
    const cv_image = req.file ? req.file.filename : null;
    if (!cv_image) {
      return redirectWithError(res, '/jobs', 'CV berupa foto wajib dilampirkan');
    }
    
    await Application.create({ user_id: userId, job_id: jobId, cv_image });

    // Redirect ke halaman lamaran dengan pesan sukses
    res.redirect('/applications?success=true');

  } catch (error) {
    console.error('Apply job error:', error);
    
    if (error.message === 'Anda sudah melamar untuk pekerjaan ini') {
      return res.redirect('/jobs?already_applied=true');
    }

    redirectWithError(res, '/jobs', 'Gagal melamar pekerjaan');
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

    let hasApplied = false;
    if (req.user && req.user.role !== 'hr') {
      const Application = require('../models/Application');
      const existingApp = await Application.findByUserAndJob(req.user.id, jobId);
      if (existingApp) hasApplied = true;
    }

    res.render('pages/job-detail', {
      title: `${job.title} - ${job.company}`,
      job,
      formatSalary,
      hasApplied
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

    if (app.status !== 'pending') {
      return res.redirect('/applications?error=Lamaran+tidak+dapat+ditarik');
    }

    // Tidak bisa tarik jika HR sudah melihat CV (status "Sedang Di Review")
    if (app.cv_is_viewed) {
      return res.redirect('/applications?error=Lamaran+tidak+dapat+ditarik+karena+CV+sudah+dilihat+oleh+HR');
    }

    await Application.cancel(applicationId, userId);
    res.redirect('/applications?cancelled=true');
  } catch (error) {
    console.error('Cancel application error:', error);
    res.redirect('/applications?error=Gagal+menarik+lamaran');
  }
};

/**
 * Merespon offering (terima/tolak)
 */
const respondOffering = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { action } = req.body;
    const status = action === 'accept' ? 'diterima' : 'ditolak';
    
    // Validasi kepemilikan lamaran
    const app = await require('../models/Application').findById(applicationId);
    if (!app || app.user_id !== req.user.id || app.status !== 'offering') {
      return res.redirect('/applications?error=Aksi+tidak+valid');
    }
    
    const sql = 'UPDATE applications SET status = ? WHERE id = ?';
    await require('../config/db').query(sql, [status, applicationId]);
    
    res.redirect('/applications?success=offering_responded');
  } catch (error) {
    console.error('Offering response error:', error);
    res.redirect('/applications?error=Gagal+merespon+offering');
  }
};

module.exports = {
  showHome,
  showDashboard,
  showFindJobs,
  showApplications,
  applyJob,
  showJobDetail,
  cancelApplication,
  respondOffering
};

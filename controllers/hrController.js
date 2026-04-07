/**
 * HR Controller
 * Menangani semua operasi untuk dashboard HR
 */
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');

/**
 * Menampilkan homepage untuk HR
 */
const showHomeHR = async (req, res) => {
  try {
    const hrId = req.user.id;

    // Ambil statistik
    const stats = await Job.getStatsForHR(hrId);

    // Ambil lowongan aktif
    const jobs = await Job.findByHR(hrId);

    // Ambil pelamar terbaru
    const recentApplicants = await Job.getRecentApplicants(hrId, 4);

    // Hitung jumlah lamaran pending
    const pendingApplications = stats.total_applicants || 0;

    // Hitung persentase growth (mock untuk saat ini, bisa diimplementasikan tracking real)
    const growthData = {
      jobsGrowth: Math.floor(Math.random() * 15) + 5,
      applicantsGrowth: Math.floor(Math.random() * 30) + 10,
      interviewsGrowth: Math.floor(Math.random() * 10) + 3,
      hiredGrowth: Math.floor(Math.random() * 20) + 5
    };

    res.render('pages/home-hr', {
      title: 'Lokerin - HR Panel',
      user: req.user,
      stats: {
        activeJobs: stats.total_jobs || 0,
        totalApplicants: stats.total_applicants || 0,
        totalInterviews: stats.total_interviews || 0,
        totalHired: stats.total_hired || 0,
        pendingApplications: pendingApplications,
        totalCandidates: Math.floor(Math.random() * 500) + 1000,
        ...growthData
      },
      jobs: jobs || [],
      recentApplicants: recentApplicants || [],
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
    console.error('HR Home error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: 'Terjadi kesalahan saat memuat halaman'
    });
  }
};

/**
 * Menampilkan dashboard HR
 * Berisi statistik: total pelamar, lowongan aktif, interview hari ini, pesan baru
 */
const showDashboard = async (req, res) => {
  try {
    const hrId = req.user.id;

    // Ambil statistik
    const stats = await Job.getStatsForHR(hrId);
    
    // Ambil lowongan aktif (total jobs)
    const activeJobs = stats.total_jobs;

    // Ambil pelamar terbaru
    const recentApplicants = await Job.getRecentApplicants(hrId, 5);

    // Ambil performa lowongan
    const jobPerformance = await Job.getJobPerformance(hrId);

    // Ambil pesan baru
    const newMessages = await Job.getNewMessagesCount(hrId);

    // Ambil jadwal hari ini
    const todaySchedule = await Job.getTodaySchedule(hrId);

    // Hitung jumlah interview hari ini (berdasarkan aplikasi yang diupdate hari ini)
    const interviewsToday = todaySchedule.length;

    // Format tanggal hari ini
    const today = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    res.render('pages/hr/dashboard', {
      layout: false,
      title: 'Dashboard HR - Lokerin',
      user: req.user,
      stats: {
        totalApplicants: stats.total_applicants,
        activeJobs: activeJobs,
        interviewsToday: interviewsToday,
        newMessages: newMessages
      },
      recentApplicants,
      jobPerformance,
      todaySchedule,
      today
    });
  } catch (error) {
    console.error('HR Dashboard error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: 'Terjadi kesalahan saat memuat dashboard'
    });
  }
};

/**
 * Menampilkan halaman kelola lowongan
 */
const showManageJobs = async (req, res) => {
  try {
    const hrId = req.user.id;
    const jobs = await Job.findByHR(hrId);

    res.render('pages/hr/manage-jobs', {
      title: 'Kelola Lowongan - Lokerin',
      user: req.user,
      jobs
    });
  } catch (error) {
    console.error('Manage Jobs error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: 'Terjadi kesalahan saat memuat data lowongan'
    });
  }
};

/**
 * Menampilkan form buat lowongan baru
 */
const showCreateJob = async (req, res) => {
  res.render('pages/hr/create-job', {
    title: 'Pasang Lowongan Baru - Lokerin',
    user: req.user,
    formData: {},
    error: null
  });
};

/**
 * Membuat lowongan baru
 */
const createJob = async (req, res) => {
  try {
    const { title, company, location, category, type, description, salary_min, salary_max } = req.body;

    // Validasi input
    if (!title || !company || !location || !description) {
      return res.render('pages/hr/create-job', {
        title: 'Pasang Lowongan Baru - Lokerin',
        user: req.user,
        formData: req.body,
        error: 'Judul, perusahaan, lokasi, dan deskripsi wajib diisi'
      });
    }

    const company_logo = req.file ? req.file.filename : null;

    // Buat lowongan
    await Job.create({
      title,
      company,
      location,
      category: category || null,
      type: type || 'Full-time',
      description,
      salary_min: salary_min ? parseInt(salary_min) : null,
      salary_max: salary_max ? parseInt(salary_max) : null,
      hr_id: req.user.id,
      company_logo
    });

    // Redirect ke halaman kelola lowongan
    res.redirect('/hr/jobs?success=created');
  } catch (error) {
    console.error('Create Job error:', error);
    res.render('pages/hr/create-job', {
      title: 'Pasang Lowongan Baru - Lokerin',
      user: req.user,
      formData: req.body,
      error: 'Terjadi kesalahan saat membuat lowongan'
    });
  }
};

/**
 * Menampilkan detail lowongan dengan daftar pelamar
 */
const showJobDetail = async (req, res) => {
  try {
    const jobId = req.params.id;
    const hrId = req.user.id;

    // Ambil detail lowongan
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).render('pages/404', {
        title: 'Lowongan Tidak Ditemukan'
      });
    }

    // Pastikan lowongan ini milik HR yang login
    if (job.hr_id !== hrId) {
      return res.status(403).render('pages/error', {
        title: 'Akses Ditolak',
        error: 'Anda tidak memiliki akses ke lowongan ini'
      });
    }

    // Ambil semua pelamar untuk lowongan ini
    const applicants = await Application.findByJobId(jobId);

    // Ambil detail user untuk setiap pelamar
    const applicantsWithDetails = [];
    for (const app of applicants) {
      const user = await User.findById(app.user_id);
      applicantsWithDetails.push({
        ...app,
        applicant: user
      });
    }

    res.render('pages/hr/job-detail', {
      title: `${job.title} - Detail Lowongan`,
      user: req.user,
      job,
      applicants: applicantsWithDetails
    });
  } catch (error) {
    console.error('Job Detail error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: 'Terjadi kesalahan saat memuat detail lowongan'
    });
  }
};

/**
 * Mengupdate status lamaran
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { status } = req.body;

    // Validasi status
    const validStatuses = ['pending', 'diterima', 'ditolak'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    await Application.updateStatus(applicationId, status);

    // Redirect kembali ke halaman sebelumnya
    const returnUrl = req.body.returnUrl || '/hr/jobs';
    res.redirect(returnUrl);
  } catch (error) {
    console.error('Update Application Status error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengupdate status' });
  }
};

/**
 * Menghapus lowongan
 */
const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const hrId = req.user.id;

    // Ambil lowongan untuk memastikan milik HR ini
    const job = await Job.findById(jobId);

    if (!job || job.hr_id !== hrId) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses untuk menghapus lowongan ini' });
    }

    await Job.delete(jobId);
    res.redirect('/hr/jobs?success=deleted');
  } catch (error) {
    console.error('Delete Job error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghapus lowongan' });
  }
};

module.exports = {
  showHomeHR,
  showDashboard,
  showManageJobs,
  showCreateJob,
  createJob,
  showJobDetail,
  updateApplicationStatus,
  deleteJob
};

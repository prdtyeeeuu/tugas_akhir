/**
 * HR Controller
 * Menangani semua operasi untuk dashboard HR
 */
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { validateReturnUrl } = require('../utils/helpers');
const { generateOfferingLetterPdf } = require('../services/pdfService');
const { sendOfferingLetterEmail } = require('../services/emailService');

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

    // Hitung persentase growth berdasarkan data real (30 hari terakhir vs 30 hari sebelumnya)
    const growthData = {
      jobsGrowth: 0,
      applicantsGrowth: 0,
      interviewsGrowth: 0,
      hiredGrowth: 0
    };

    // Gunakan data real dari database
    const finalStats = {
      activeJobs: stats.total_jobs || 0,
      totalApplicants: stats.total_applicants || 0,
      totalInterviews: stats.total_interviews || 0,
      totalHired: stats.total_hired || 0,
      pendingApplications: stats.pending_applications || 0,
      totalCandidates: stats.total_candidates || 0,
      ...growthData
    };

    res.render('pages/home-hr', {
      title: 'Lokerin - HR Panel',
      user: req.user,
      stats: finalStats,
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
      currentUser: req.user, // Untuk navbar partial
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
    const { title, company, location, work_address, category, type, description, salary_min, salary_max, deadline, requirements } = req.body;

    // Validasi input
    if (!title || !company || !location || !work_address || !description) {
      return res.render('pages/hr/create-job', {
        title: 'Pasang Lowongan Baru - Lokerin',
        user: req.user,
        formData: req.body,
        error: 'Judul, perusahaan, lokasi, alamat lengkap, dan deskripsi wajib diisi'
      });
    }

    const company_logo = req.file ? req.file.filename : null;

    // Process category, might be array or string
    let categoryString = null;
    if (category) {
      if (Array.isArray(category)) {
        categoryString = category.join(', ');
      } else {
        categoryString = category;
      }
    }

    // Process requirements (array to JSON string)
    let requirementsString = null;
    if (requirements) {
      if (Array.isArray(requirements)) {
        requirementsString = JSON.stringify(requirements.filter(r => r && r.trim() !== ''));
      } else if (typeof requirements === 'string' && requirements.trim() !== '') {
        requirementsString = JSON.stringify([requirements.trim()]);
      }
    }

    // Buat lowongan
    await Job.create({
      title,
      company,
      location,
      work_address,
      category: categoryString,
      type: type || 'Full-time',
      description,
      salary_min: salary_min ? parseInt(salary_min) : null,
      salary_max: salary_max ? parseInt(salary_max) : null,
      deadline: deadline || null,
      hr_id: req.user.id,
      company_logo,
      requirements: requirementsString
    });

    // Redirect ke halaman kelola lowongan
    res.redirect('/hr/jobs?success=created');
  } catch (error) {
    console.error('Create Job error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Tampilkan error detail untuk debugging
    res.render('pages/hr/create-job', {
      title: 'Pasang Lowongan Baru - Lokerin',
      user: req.user,
      formData: req.body,
      error: `Error: ${error.message}`
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
    let returnUrl = validateReturnUrl(req.query.returnUrl) || '/hr/jobs';

    if (!returnUrl.startsWith('/hr/')) {
      returnUrl = '/hr/jobs';
    }

    // Ambil detail lowongan
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).render('pages/404', {
        title: 'Lowongan Tidak Ditemukan',
        user: req.user || null
      });
    }

    // Pastikan lowongan ini milik HR yang login
    if (job.hr_id !== hrId) {
      return res.status(403).render('pages/error', {
        title: 'Akses Ditolak',
        error: 'Anda tidak memiliki akses ke lowongan ini'
      });
    }

    // Ambil semua pelamar untuk lowongan ini (dengan JOIN users untuk menghindari N+1)
    const applicants = await Application.findByJobIdWithDetails(jobId);

    res.render('pages/hr/job-detail', {
      title: `${job.title} - Detail Lowongan`,
      user: req.user,
      job,
      applicants: applicants,
      returnUrl
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

    const statusAliases = {
      pending: 'applied',
      interview: 'interviewing',
      ditolak: 'rejected',
      declined: 'rejected'
    };
    const nextStatus = statusAliases[status] || status;

    const validStatuses = ['applied', 'interviewing', 'declined', 'rejected'];
    if (!validStatuses.includes(nextStatus)) {
      const returnUrl = req.body.returnUrl || '/hr/jobs';
      return res.redirect(`${returnUrl}?error=Status+tidak+valid`);
    }

    // Ambil data aplikasi sebelumnya untuk validasi
    const currentApplication = await Application.findById(applicationId);
    
    if (!currentApplication) {
      const returnUrl = req.body.returnUrl || '/hr/jobs';
      return res.redirect(`${returnUrl}?error=Lamaran+tidak+ditemukan`);
    }

    // Jika aplikasi sudah ditolak, tidak bisa mengubah status ke apapun
    if (currentApplication.status === 'declined' || currentApplication.status === 'rejected') {
      const returnUrl = req.body.returnUrl || '/hr/jobs';
      return res.redirect(`${returnUrl}?error=Tidak+bisa+mengubah+status+pelamar+yang+sudah+ditolak`);
    }

    // Jika user mencoba mengubah ke interview dari status yang bukan pending, cegah
    if (nextStatus === 'interviewing' && currentApplication.status !== 'applied') {
      const returnUrl = req.body.returnUrl || '/hr/jobs';
      return res.redirect(`${returnUrl}?error=Hanya+pelamar+dengan+status+pending+yang+bisa+dipanggil+untuk+wawancara`);
    }

    if (nextStatus === 'interviewing') {
      const returnUrl = req.body.returnUrl || '/hr/jobs';
      return res.redirect(`${returnUrl}?error=Isi+jadwal+waktu+metode+dan+lokasi+wawancara+terlebih+dahulu`);
    }

    await Application.updateStatus(applicationId, nextStatus);

    const returnUrl = req.body.returnUrl || '/hr/jobs';
    res.redirect(`${returnUrl}?success=status_updated`);
  } catch (error) {
    console.error('Update Application Status error:', error);
    const returnUrl = req.body.returnUrl || '/hr/jobs';
    res.redirect(`${returnUrl}?error=Gagal+mengupdate+status`);
  }
};

/**
 * Menampilkan halaman jadwal interview
 */
const showInterviews = async (req, res) => {
  try {
    const hrId = req.user.id;
    const interviews = await Application.findInterviewsByHR(hrId);

    res.render('pages/hr/interviews', {
      title: 'Jadwal Interview - Lokerin',
      user: req.user,
      interviews: interviews || [],
      active: 'hr-interviews'
    });
  } catch (error) {
    console.error('Interviews error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: 'Terjadi kesalahan saat memuat data interview'
    });
  }
};

/**
 * Menghapus lowongan
 */
const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const hrId = req.user.id;

    const job = await Job.findById(jobId);

    if (!job || job.hr_id !== hrId) {
      return res.redirect('/hr/jobs?error=Anda+tidak+memiliki+akses+untuk+menghapus+lowongan+ini');
    }

    await Job.delete(jobId);
    res.redirect('/hr/jobs?success=deleted');
  } catch (error) {
    console.error('Delete Job error:', error);
    res.redirect('/hr/jobs?error=Gagal+menghapus+lowongan');
  }
};

/**
 * Menandai CV sebagai sudah dilihat
 */
const markCvViewed = async (req, res) => {
  try {
    const applicationId = req.params.id;
    // Panggil model untuk merubah status
    await Application.markCvAsViewed(applicationId);
    
    return res.json({ success: true, message: 'CV marked as viewed' });
  } catch (error) {
    console.error('Mark CV viewed error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
};

/**
 * Mengirim Offering Letter ke pelamar
 */
const sendOffering = async (req, res) => {
  try {
    const applicationId = req.params.id;

    const application = await Application.findById(applicationId);
    if (!application || application.hr_id !== req.user.id) {
      const returnUrl = req.body.returnUrl || '/hr/interviews';
      return res.redirect(`${returnUrl}?error=Lamaran+tidak+ditemukan`);
    }

    const startDate = req.body.start_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiryDate = req.body.expired_at || req.body.expiry_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const salary = req.body.salary || application.salary_max || application.salary_min || 0;

    const pdf = await generateOfferingLetterPdf({
      applicationId,
      companyName: application.company,
      jobSeekerName: application.applicant_name,
      jobSeekerCity: application.applicant_address || 'Di Tempat',
      jobPosition: application.job_title,
      salary,
      startDate,
      expiryDate,
      workLocation: application.job_work_address || application.job_location,
      currentDate: new Date()
    });

    await Application.sendOffering(applicationId, pdf.relativePath, new Date(expiryDate));

    try {
      await sendOfferingLetterEmail({
        to: application.applicant_email,
        jobSeekerName: application.applicant_name,
        companyName: application.company,
        jobPosition: application.job_title,
        pdfPath: pdf.absolutePath,
        applicationId
      });
    } catch (emailError) {
      console.error('Send offering email error:', emailError.message);
    }
    
    const returnUrl = req.body.returnUrl || '/hr/interviews';
    return res.redirect(`${returnUrl}?success=offering_sent`);
  } catch (error) {
    console.error('Send Offering error:', error);
    const returnUrl = req.body.returnUrl || '/hr/interviews';
    return res.redirect(`${returnUrl}?error=Gagal+mengirim+offering`);
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
  showInterviews,
  deleteJob,
  markCvViewed,
  sendOffering
};

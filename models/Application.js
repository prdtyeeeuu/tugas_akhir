/**
 * Application Model
 * Mengelola semua operasi database terkait lamaran pekerjaan
 */
const { query } = require('../config/db');

const STATUS_ALIASES = {
  pending: 'applied',
  review: 'applied',
  interview: 'interviewing',
  offering: 'offered',
  diterima: 'accepted',
  ditolak: 'rejected',
  declined: 'rejected'
};

const VALID_STATUSES = ['applied', 'interviewing', 'offered', 'accepted', 'declined', 'rejected', 'expired', 'withdrawn'];

function normalizeStatus(status) {
  return STATUS_ALIASES[status] || status;
}

const Application = {
  /**
   * Membuat lamaran baru
   * @param {object} appData - { user_id, job_id }
   * @returns {Promise} - ID lamaran yang baru dibuat
   */
  create: async (appData) => {
    const { user_id, job_id, cv_image } = appData;
    
    // Cek apakah user sudah melamar job ini sebelumnya
    const existing = await Application.findByUserAndJob(user_id, job_id);
    if (existing) {
      throw new Error('Anda sudah melamar untuk pekerjaan ini');
    }

    const sql = `
      INSERT INTO applications (user_id, job_id, status, cv_image)
      VALUES (?, ?, 'applied', ?)
    `;
    
    const result = await query(sql, [user_id, job_id, cv_image || null]);
    return result.insertId;
  },

  /**
   * Mengambil semua lamaran dari seorang user beserta detail job
   * @param {number} userId - ID user
   * @returns {Promise} - Array of applications
   */
  findByUserId: async (userId) => {
    const sql = `
      SELECT a.*, j.title as job_title, j.company, j.location, j.type, j.company_logo, j.hr_id,
             a.created_at as applied_at
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `;
    return await query(sql, [userId]);
  },

  /**
   * Cek apakah user sudah melamar job tertentu
   * @param {number} userId - ID user
   * @param {number} jobId - ID job
   * @returns {Promise} - Data application atau null
   */
  findByUserAndJob: async (userId, jobId) => {
    const sql = 'SELECT * FROM applications WHERE user_id = ? AND job_id = ?';
    const results = await query(sql, [userId, jobId]);
    return results[0] || null;
  },

  /**
   * Mengambil semua lamaran untuk sebuah job (dengan user details JOIN)
   * @param {number} jobId - ID job
   * @returns {Promise} - Array of applications with user details
   */
  findByJobIdWithDetails: async (jobId) => {
    const sql = `
      SELECT a.*, u.id as user_id, u.name, u.email, u.profile_image, u.bio, u.phone, u.address,
             u.expected_salary_min, u.expected_salary_max, u.open_to_work, u.work_preferences
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.job_id = ?
      ORDER BY a.created_at DESC
    `;
    return await query(sql, [jobId]);
  },

  /**
   * Mengambil semua lamaran untuk sebuah job
   * @param {number} jobId - ID job
   * @returns {Promise} - Array of applications
   */
  findByJobId: async (jobId) => {
    const sql = `
      SELECT a.*, u.name, u.email, u.profile_image as applicant_image
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.job_id = ?
      ORDER BY a.created_at DESC
    `;
    return await query(sql, [jobId]);
  },

  /**
   * Mengupdate status lamaran (untuk HR)
   * @param {number} id - ID lamaran
   * @param {string} status - Status baru (pending/diterima/ditolak)
   * @returns {Promise} - Hasil update
   */
  updateStatus: async (id, status) => {
    const normalizedStatus = normalizeStatus(status);
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      throw new Error('Status tidak valid');
    }

    // Ambil data aplikasi saat ini
    const currentApp = await Application.findById(id);
    if (!currentApp) {
      throw new Error('Aplikasi tidak ditemukan');
    }

    // Jika aplikasi sudah ditolak, tidak bisa diubah
    if (currentApp.status === 'declined' || currentApp.status === 'rejected') {
      throw new Error('Tidak dapat mengubah status pelamar yang sudah ditolak');
    }

    const sql = 'UPDATE applications SET status = ? WHERE id = ?';
    await query(sql, [normalizedStatus, id]);
    return true;
  },

  scheduleInterview: async (id, hrId, interviewData) => {
    const { interviewDate, interviewTime, interviewMethod, interviewLocation } = interviewData;
    const sql = `
      UPDATE applications a
      JOIN jobs j ON a.job_id = j.id
      SET
        a.status = 'interviewing',
        a.interview_date = ?,
        a.interview_time = ?,
        a.interview_method = ?,
        a.interview_location = ?
      WHERE a.id = ? AND j.hr_id = ?
    `;
    const result = await query(sql, [interviewDate, interviewTime, interviewMethod, interviewLocation, id, hrId]);
    return result.affectedRows > 0;
  },

  rejectByHR: async (id, hrId, reason) => {
    const sql = `
      UPDATE applications a
      JOIN jobs j ON a.job_id = j.id
      SET
        a.status = 'rejected',
        a.rejection_reason = ?
      WHERE a.id = ?
        AND j.hr_id = ?
        AND a.status NOT IN ('accepted', 'rejected', 'declined', 'expired', 'withdrawn')
    `;
    const result = await query(sql, [reason, id, hrId]);
    return result.affectedRows > 0;
  },

  /**
   * Mengubah status CV menjadi sudah dilihat
   * @param {number} id - ID lamaran
   * @returns {Promise}
   */
  markCvAsViewed: async (id) => {
    const sql = 'UPDATE applications SET cv_is_viewed = 1 WHERE id = ?';
    await query(sql, [id]);
    return true;
  },

  markProfileViewedByHR: async (userId, hrId) => {
    const sql = `
      UPDATE applications a
      JOIN jobs j ON a.job_id = j.id
      SET a.cv_is_viewed = 1
      WHERE a.user_id = ?
        AND j.hr_id = ?
        AND a.cv_is_viewed = 0
    `;
    const result = await query(sql, [userId, hrId]);
    return result.affectedRows || 0;
  },

  /**
   * Mendapatkan detail lamaran berdasarkan ID
   * @param {number} id - ID lamaran
   * @returns {Promise} - Data lamaran
   */
  findById: async (id) => {
    const sql = `
      SELECT
        a.*,
        j.title as job_title,
        j.company,
        j.location as job_location,
        j.work_address as job_work_address,
        j.salary_min,
        j.salary_max,
        j.hr_id,
        u.name as applicant_name,
        u.email as applicant_email,
        u.address as applicant_address
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `;
    const results = await query(sql, [id]);
    return results[0] || null;
  },

  /**
   * Cancel/membatalkan lamaran (dengan ownership check)
   * @param {number} id - ID lamaran
   * @param {number} userId - ID user yang membatalkan
   * @returns {Promise<boolean>} - True jika berhasil
   */
  cancel: async (id, userId) => {
    const sql = 'DELETE FROM applications WHERE id = ? AND user_id = ?';
    const result = await query(sql, [id, userId]);
    return result.affectedRows > 0;
  },

  /**
   * Menghitung statistik aplikasi untuk seorang user
   * @param {number} userId - ID user
   * @returns {Promise} - Object berisi statistik
   */
  getStats: async (userId) => {
    const sql = `
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'interviewing' OR interview_date IS NOT NULL THEN 1 ELSE 0 END), 0) as interview,
        COALESCE(SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END), 0) as accepted,
        COALESCE(SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status IN ('declined', 'rejected') THEN 1 ELSE 0 END), 0) as rejected,
        COALESCE(SUM(CASE WHEN cv_is_viewed = 1 THEN 1 ELSE 0 END), 0) as profile_views
      FROM applications
      WHERE user_id = ?
    `;
    const results = await query(sql, [userId]);
    return results[0] || {
      total: 0,
      interview: 0,
      accepted: 0,
      pending: 0,
      rejected: 0,
      profile_views: 0
    };
  },

  /**
   * Mengambil semua lamaran berstatus 'interview' untuk HR tertentu
   * @param {number} hrId - ID HR
   * @returns {Promise} - Array of interview applications
   */
  findInterviewsByHR: async (hrId) => {
    const sql = `
      SELECT
        a.*,
        u.name as applicant_name,
        u.email as applicant_email,
        u.profile_image as applicant_image,
        u.phone as applicant_phone,
        j.title as job_title,
        j.company,
        j.location,
        j.type
      FROM applications a
      JOIN users u ON a.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE j.hr_id = ? AND a.status = 'interviewing'
      ORDER BY a.updated_at DESC
    `;
    return await query(sql, [hrId]);
  },

  /**
   * Mengirim dokumen offering
   * @param {number} id - ID lamaran
   * @param {string} offeringDocument - Nama file offering
   * @returns {Promise}
   */
  sendOffering: async (id, documentPath, expiredAt) => {
    const sql = 'UPDATE applications SET status = ?, document_path = ?, expired_at = ? WHERE id = ?';
    const result = await query(sql, ['offered', documentPath, expiredAt, id]);
    return result.affectedRows > 0;
  },

  respondOffering: async (id, userId, action) => {
    const nextStatus = action === 'accept' ? 'accepted' : 'declined';
    const sql = `
      UPDATE applications
      SET status = ?
      WHERE id = ?
        AND user_id = ?
        AND status = 'offered'
        AND (expired_at IS NULL OR expired_at >= NOW())
    `;
    const result = await query(sql, [nextStatus, id, userId]);
    return result.affectedRows > 0;
  },

  expireOldOfferings: async () => {
    const sql = `
      UPDATE applications
      SET status = 'expired'
      WHERE status = 'offered'
        AND expired_at IS NOT NULL
        AND expired_at < NOW()
    `;
    const result = await query(sql);
    return result.affectedRows || 0;
  }
};

module.exports = Application;

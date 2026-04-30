/**
 * Application Model
 * Mengelola semua operasi database terkait lamaran pekerjaan
 */
const { query } = require('../config/db');

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
      VALUES (?, ?, 'pending', ?)
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
    const validStatuses = ['pending', 'review', 'interview', 'diterima', 'ditolak'];
    if (!validStatuses.includes(status)) {
      throw new Error('Status tidak valid');
    }

    // Ambil data aplikasi saat ini
    const currentApp = await Application.findById(id);
    if (!currentApp) {
      throw new Error('Aplikasi tidak ditemukan');
    }

    // Jika aplikasi sudah ditolak, tidak bisa diubah
    if (currentApp.status === 'ditolak') {
      throw new Error('Tidak dapat mengubah status pelamar yang sudah ditolak');
    }

    const sql = 'UPDATE applications SET status = ? WHERE id = ?';
    await query(sql, [status, id]);
    return true;
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

  /**
   * Mendapatkan detail lamaran berdasarkan ID
   * @param {number} id - ID lamaran
   * @returns {Promise} - Data lamaran
   */
  findById: async (id) => {
    const sql = `
      SELECT a.*, j.title as job_title, j.company, u.name as applicant_name, u.email as applicant_email
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
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'diterima' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) as rejected
      FROM applications
      WHERE user_id = ?
    `;
    const results = await query(sql, [userId]);
    return results[0] || {
      total: 0,
      interview: 0,
      accepted: 0,
      pending: 0,
      rejected: 0
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
      WHERE j.hr_id = ? AND a.status = 'interview'
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
  sendOffering: async (id, offeringDocument) => {
    const sql = 'UPDATE applications SET status = ?, offering_document = ? WHERE id = ?';
    const result = await query(sql, ['offering', offeringDocument, id]);
    return result.affectedRows > 0;
  }
};

module.exports = Application;

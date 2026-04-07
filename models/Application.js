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
    const { user_id, job_id } = appData;
    
    // Cek apakah user sudah melamar job ini sebelumnya
    const existing = await Application.findByUserAndJob(user_id, job_id);
    if (existing) {
      throw new Error('Anda sudah melamar untuk pekerjaan ini');
    }

    const sql = `
      INSERT INTO applications (user_id, job_id, status) 
      VALUES (?, ?, 'pending')
    `;
    
    const result = await query(sql, [user_id, job_id]);
    return result.insertId;
  },

  /**
   * Mengambil semua lamaran dari seorang user beserta detail job
   * @param {number} userId - ID user
   * @returns {Promise} - Array of applications
   */
  findByUserId: async (userId) => {
    const sql = `
      SELECT a.*, j.title as job_title, j.company, j.location, j.type,
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
   * Mengambil semua lamaran untuk sebuah job
   * @param {number} jobId - ID job
   * @returns {Promise} - Array of applications
   */
  findByJobId: async (jobId) => {
    const sql = `
      SELECT a.*, u.name, u.email
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
    const validStatuses = ['pending', 'diterima', 'ditolak'];
    if (!validStatuses.includes(status)) {
      throw new Error('Status tidak valid');
    }

    const sql = 'UPDATE applications SET status = ? WHERE id = ?';
    await query(sql, [status, id]);
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
  }
};

module.exports = Application;

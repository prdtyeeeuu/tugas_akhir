/**
 * Job Model
 * Mengelola semua operasi database terkait lowongan pekerjaan
 */
const { query } = require('../config/db');

const Job = {
  /**
   * Membuat lowongan kerja baru
   * @param {object} jobData - Data lowongan kerja
   * @returns {Promise} - ID job yang baru dibuat
   */
  create: async (jobData) => {
    const { title, company, location, category, type, description, salary_min, salary_max, hr_id, company_logo, deadline } = jobData;

    const sql = `
      INSERT INTO jobs (title, company, location, category, type, description, salary_min, salary_max, hr_id, company_logo, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [title, company, location, category, type, description, salary_min || null, salary_max || null, hr_id, company_logo || null, deadline || null]);
    return result.insertId;
  },

  /**
   * Mengambil semua lowongan kerja (dengan pagination)
   * @param {object} filters - Filter opsional { category, search }
   * @param {object} pagination - Pagination opsional { page, limit }
   * @returns {Promise} - Array of jobs + total count
   */
  findAll: async (filters = {}, pagination = {}) => {
    let whereClause = '';
    const params = [];
    const countParams = [];

    if (filters.category) {
      whereClause += ' AND j.category LIKE ?';
      params.push(`%${filters.category}%`);
      countParams.push(`%${filters.category}%`);
    }

    if (filters.search) {
      whereClause += ' AND (j.title LIKE ? OR j.company LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM jobs j WHERE 1=1${whereClause}`;
    const [totalResult] = await query(countSql, countParams);
    const total = totalResult.total;

    // Get paginated results
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 20));
    const offset = (page - 1) * limit;

    const sql = `
      SELECT j.*, u.name as hr_name, u.profile_image as hr_image
      FROM jobs j
      LEFT JOIN users u ON j.hr_id = u.id
      WHERE 1=1${whereClause}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const jobs = await query(sql, params);
    return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  /**
   * Mengambil lowongan berdasarkan ID
   * @param {number} id - ID lowongan
   * @returns {Promise} - Data job
   */
  findById: async (id) => {
    const sql = `
      SELECT j.*, u.name as hr_name, u.profile_image as hr_image 
      FROM jobs j 
      LEFT JOIN users u ON j.hr_id = u.id 
      WHERE j.id = ?
    `;
    const results = await query(sql, [id]);
    return results[0] || null;
  },

  /**
   * Mengambil lowongan terbaru untuk rekomendasi
   * @param {number} limit - Jumlah maksimal job
   * @returns {Promise} - Array of jobs
   */
  findRecent: async (limit = 6) => {
    const sql = `
      SELECT j.*, u.name as hr_name, u.profile_image as hr_image 
      FROM jobs j 
      LEFT JOIN users u ON j.hr_id = u.id 
      ORDER BY j.created_at DESC 
      LIMIT ?
    `;
    return await query(sql, [limit]);
  },

  /**
   * Mengambil semua kategori job yang unik
   * @returns {Promise} - Array of categories
   */
  findCategories: async () => {
    const sql = 'SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL ORDER BY category';
    return await query(sql);
  },

  /**
   * Mengupdate lowongan kerja
   * @param {number} id - ID lowongan
   * @param {object} updateData - Data yang akan diupdate
   * @returns {Promise} - Hasil update
   */
  update: async (id, updateData) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && value !== null) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`;
    
    await query(sql, values);
    return true;
  },

  /**
   * Menghapus lowongan kerja
   * @param {number} id - ID lowongan
   * @returns {Promise} - Hasil delete
   */
  delete: async (id) => {
    const sql = 'DELETE FROM jobs WHERE id = ?';
    await query(sql, [id]);
    return true;
  },

  /**
   * Mengambil lowongan kerja yang dibuat oleh HR tertentu
   * @param {number} hrId - ID HR
   * @returns {Promise} - Array of jobs dengan jumlah pelamar
   */
  findByHR: async (hrId) => {
    const sql = `
      SELECT j.*, 
             COUNT(a.id) as applicant_count,
             SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
             SUM(CASE WHEN a.status = 'diterima' THEN 1 ELSE 0 END) as accepted_count,
             SUM(CASE WHEN a.status = 'ditolak' THEN 1 ELSE 0 END) as rejected_count
      FROM jobs j
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE j.hr_id = ?
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `;
    return await query(sql, [hrId]);
  },

  /**
   * Mengambil statistik lowongan untuk dashboard HR
   * @param {number} hrId - ID HR
   * @returns {Promise} - Statistik lowongan
   */
  getStatsForHR: async (hrId) => {
    const sql = `
      SELECT 
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT CASE WHEN j.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN j.id END) as jobs_this_month,
        COUNT(DISTINCT a.id) as total_applicants,
        COUNT(DISTINCT CASE WHEN a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN a.id END) as applicants_this_week,
        COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'diterima' THEN a.id END) as accepted_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'ditolak' THEN a.id END) as rejected_applications
      FROM jobs j
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE j.hr_id = ?
    `;
    const results = await query(sql, [hrId]);
    return results[0] || {
      total_jobs: 0,
      jobs_this_month: 0,
      total_applicants: 0,
      applicants_this_week: 0,
      pending_applications: 0,
      accepted_applications: 0,
      rejected_applications: 0
    };
  },

  /**
   * Mengambil pelamar terbaru untuk lowongan HR
   * @param {number} hrId - ID HR
   * @param {number} limit - Jumlah maksimal
   * @returns {Promise} - Array of applicants terbaru
   */
  getRecentApplicants: async (hrId, limit = 10) => {
    const sql = `
      SELECT
        a.*,
        a.user_id,
        j.title as job_title,
        u.name as applicant_name,
        u.email as applicant_email,
        u.profile_image as applicant_image
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      WHERE j.hr_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `;
    return await query(sql, [hrId, limit]);
  },

  /**
   * Mengambil performa setiap lowongan (jumlah pelamar per lowongan)
   * @param {number} hrId - ID HR
   * @returns {Promise} - Performa lowongan
   */
  getJobPerformance: async (hrId) => {
    const sql = `
      SELECT 
        j.id,
        j.title,
        COUNT(a.id) as applicant_count
      FROM jobs j
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE j.hr_id = ?
      GROUP BY j.id, j.title
      ORDER BY applicant_count DESC
      LIMIT 10
    `;
    return await query(sql, [hrId]);
  },

  /**
   * Mengambil jumlah pesan baru untuk HR
   * @param {number} hrId - ID HR
   * @returns {Promise} - Jumlah pesan baru
   */
  getNewMessagesCount: async (hrId) => {
    const sql = `
      SELECT COUNT(*) as count
      FROM chat_messages m
      JOIN chat_conversations c ON m.conversation_id = c.id
      WHERE c.hr_id = ? AND m.receiver_id = ? AND m.is_read = FALSE
    `;
    const results = await query(sql, [hrId, hrId]);
    return results[0]?.count || 0;
  },

  /**
   * Mengambil jadwal interview hari ini (dari applications dengan status tertentu)
   * @param {number} hrId - ID HR
   * @returns {Promise} - Jadwal hari ini
   */
  getTodaySchedule: async (hrId) => {
    // Karena belum ada model Interview, kita ambil applications yang baru di-update hari ini
    const sql = `
      SELECT 
        a.*,
        j.title as job_title,
        u.name as applicant_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      WHERE j.hr_id = ? 
        AND DATE(a.updated_at) = CURDATE()
      ORDER BY a.updated_at DESC
      LIMIT 5
    `;
    return await query(sql, [hrId]);
  }
};

module.exports = Job;

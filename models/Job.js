/**
 * Job Model
 * Mengelola semua operasi database terkait lowongan pekerjaan
 */
const { query, rawQuery } = require('../config/db');

const Job = {
  /**
   * Membuat lowongan kerja baru
   * @param {object} jobData - Data lowongan kerja
   * @returns {Promise} - ID job yang baru dibuat
   */
  create: async (jobData) => {
    const { title, company, location, work_address, category, type, description, salary_min, salary_max, hr_id, company_logo, deadline, requirements } = jobData;

    const sql = `
      INSERT INTO jobs (title, company, location, work_address, category, type, description, salary_min, salary_max, hr_id, company_logo, deadline, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [title, company, location, work_address || null, category, type, description, salary_min || null, salary_max || null, hr_id, company_logo || null, deadline || null, requirements || null]);
    return result.insertId;
  },

  /**
   * Mengambil semua lowongan kerja (dengan pagination)
   * @param {object} filters - Filter opsional { category, search }
   * @param {object} pagination - Pagination opsional { page, limit }
   * @returns {Promise} - Array of jobs + total count
   */
  findAll: async (filters = {}, pagination = {}) => {
    let whereClause = " AND (j.status IS NULL OR j.status = 'active') AND (j.deadline IS NULL OR j.deadline > CURDATE())";
    const params = [];
    const countParams = [];

    if (filters.category) {
      whereClause += ' AND j.category LIKE ?';
      params.push(`%${filters.category}%`);
      countParams.push(`%${filters.category}%`);
    }

    if (filters.categories && filters.categories.length > 0) {
      const categoryConditions = filters.categories.map(() => 'j.category LIKE ?').join(' OR ');
      whereClause += ` AND (${categoryConditions})`;

      filters.categories.forEach(category => {
        params.push(`%${category}%`);
        countParams.push(`%${category}%`);
      });
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

    const jobs = await rawQuery(sql, params);
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
      WHERE (j.status IS NULL OR j.status = 'active')
        AND (j.deadline IS NULL OR j.deadline > CURDATE())
      ORDER BY j.created_at DESC 
      LIMIT ?
    `;
    return await rawQuery(sql, [parseInt(limit)]);
  },

  /**
   * Mengambil semua kategori job yang unik beserta jumlah lowongannya
   * @returns {Promise} - Array of categories { name, count }
   */
  findCategories: async () => {
    const sql = `
      SELECT category
      FROM jobs
      WHERE category IS NOT NULL
        AND category <> ''
        AND (status IS NULL OR status = 'active')
        AND (deadline IS NULL OR deadline > CURDATE())
    `;
    const rows = await query(sql);
    const categoryCounts = new Map();

    rows.forEach((row) => {
      String(row.category || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((name) => {
          categoryCounts.set(name, (categoryCounts.get(name) || 0) + 1);
        });
    });

    return Array.from(categoryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 4);
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
             SUM(CASE WHEN a.status = 'applied' THEN 1 ELSE 0 END) as pending_count,
             SUM(CASE WHEN a.status = 'accepted' THEN 1 ELSE 0 END) as accepted_count,
             SUM(CASE WHEN a.status IN ('declined', 'rejected') THEN 1 ELSE 0 END) as rejected_count
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
        COUNT(DISTINCT CASE WHEN DATE(a.created_at) = CURDATE() THEN a.id END) as total_candidates,
        COUNT(DISTINCT CASE WHEN a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN a.id END) as applicants_this_week,
        COUNT(DISTINCT CASE WHEN a.status = 'applied' THEN a.id END) as pending_applications,
        COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as accepted_applications,
        COUNT(DISTINCT CASE WHEN a.status IN ('declined', 'rejected') THEN a.id END) as rejected_applications
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
        u.profile_image as applicant_image,
        exp.total_experience_months
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN (
        SELECT
          user_id,
          SUM(GREATEST(TIMESTAMPDIFF(MONTH, start_date, COALESCE(end_date, CURDATE())), 0)) as total_experience_months
        FROM experiences
        WHERE start_date IS NOT NULL
        GROUP BY user_id
      ) exp ON exp.user_id = u.id
      WHERE j.hr_id = ?
      ORDER BY a.created_at DESC
      LIMIT ?
    `;
    return await rawQuery(sql, [parseInt(hrId), parseInt(limit)]);
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
    return await rawQuery(sql, [parseInt(hrId)]);
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
   * Mengambil statistik global untuk homepage
   * @returns {Promise} - Statistik { jobs, companies, workers }
   */
  getGlobalStats: async () => {
    try {
      const jobsSql = 'SELECT COUNT(*) as total FROM jobs';
      const newJobsThisWeekSql = 'SELECT COUNT(*) as total FROM jobs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      // Menghitung perusahaan dari nama perusahaan unik yang ada di lowongan.
      const companiesSql = 'SELECT COUNT(DISTINCT company) as total FROM jobs WHERE company IS NOT NULL AND company <> ""';
      // Menghitung pekerja yang sudah diterima
      const workersSql = "SELECT COUNT(DISTINCT user_id) as total FROM applications WHERE status = 'accepted'";

      const [jobsRes] = await query(jobsSql);
      const [newJobsThisWeekRes] = await query(newJobsThisWeekSql);
      const [compRes] = await query(companiesSql);
      const [workRes] = await query(workersSql);

      return {
        jobs: jobsRes?.total || 0,
        newJobsThisWeek: newJobsThisWeekRes?.total || 0,
        companies: compRes?.total || 0,
        workers: workRes?.total || 0
      };
    } catch (error) {
      console.error('Error fetching global stats:', error);
      return { jobs: 0, newJobsThisWeek: 0, companies: 0, workers: 0 };
    }
  },

  /**
   * Mengambil jadwal interview terdekat dari data applications.
   * @param {number} hrId - ID HR
   * @returns {Promise} - Jadwal interview
   */
  getTodaySchedule: async (hrId) => {
    const sql = `
      SELECT 
        a.id,
        a.job_id,
        a.interview_method,
        a.interview_location,
        DATE_FORMAT(a.interview_date, '%Y-%m-%d') as interview_date,
        TIME_FORMAT(a.interview_time, '%H:%i') as interview_time,
        j.title as job_title,
        u.name as applicant_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.user_id = u.id
      WHERE j.hr_id = ? 
        AND a.status = 'interviewing'
        AND a.interview_date IS NOT NULL
        AND a.interview_time IS NOT NULL
        AND a.interview_date >= CURDATE()
      ORDER BY a.interview_date ASC, a.interview_time ASC
      LIMIT 5
    `;
    return await rawQuery(sql, [parseInt(hrId)]);
  }
};

module.exports = Job;

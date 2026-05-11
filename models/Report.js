const { query, rawQuery } = require('../config/db');

const VALID_TARGETS = ['job', 'user'];

const Report = {
  create: async ({ reporterId, targetType, targetId, reason, details }) => {
    if (!VALID_TARGETS.includes(targetType)) {
      throw new Error('Tipe laporan tidak valid');
    }

    const sql = `
      INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      reporterId,
      targetType,
      targetId,
      reason,
      details || null
    ]);
    return result.insertId;
  },

  findAll: async ({ status = 'pending', page = 1, limit = 10 } = {}) => {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(100, Math.max(parseInt(limit, 10) || 10, 1));
    const offset = (safePage - 1) * safeLimit;
    const params = [];
    let where = 'WHERE 1=1';

    if (status && status !== 'all') {
      where += ' AND r.status = ?';
      params.push(status);
    }

    const countRows = await query(`SELECT COUNT(*) as total FROM reports r ${where}`, params);
    const total = countRows[0]?.total || 0;

    const rows = await rawQuery(`
      SELECT
        r.*,
        reporter.name as reporter_name,
        reporter.email as reporter_email,
        target_user.name as target_user_name,
        target_user.email as target_user_email,
        target_user.status as target_user_status,
        target_job.title as target_job_title,
        target_job.company as target_job_company,
        target_job.status as target_job_status,
        target_job.hr_id as target_job_hr_id,
        job_hr.name as target_job_hr_name
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users target_user ON r.target_type = 'user' AND target_user.id = r.target_id
      LEFT JOIN jobs target_job ON r.target_type = 'job' AND target_job.id = r.target_id
      LEFT JOIN users job_hr ON target_job.hr_id = job_hr.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, safeLimit, offset]);

    return {
      reports: rows,
      pagination: {
        page: safePage,
        totalPages: Math.ceil(total / safeLimit),
        hasNext: safePage < Math.ceil(total / safeLimit),
        hasPrev: safePage > 1
      }
    };
  },

  findById: async (id) => {
    const rows = await query('SELECT * FROM reports WHERE id = ?', [id]);
    return rows[0] || null;
  },

  updateStatus: async (id, status, adminId, adminNote = null) => {
    const sql = `
      UPDATE reports
      SET status = ?, admin_id = ?, admin_note = ?, reviewed_at = NOW()
      WHERE id = ?
    `;
    const result = await query(sql, [status, adminId, adminNote, id]);
    return result.affectedRows > 0;
  },

  getPendingCount: async () => {
    const rows = await query("SELECT COUNT(*) as total FROM reports WHERE status = 'pending'");
    return rows[0]?.total || 0;
  }
};

module.exports = Report;

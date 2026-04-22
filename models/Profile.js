/**
 * Profile Model
 * Mengelola semua operasi database terkait structured profile
 * All operations include ownership verification via user_id parameter
 */
const { query } = require('../config/db');

const Profile = {
  // ==================== SKILLS ====================

  getSkills: async (userId) => {
    const sql = 'SELECT * FROM skills WHERE user_id = ? ORDER BY created_at DESC';
    return await query(sql, [userId]);
  },

  addSkill: async (userId, name, level = 'Intermediate') => {
    const sql = 'INSERT INTO skills (user_id, name, level) VALUES (?, ?, ?)';
    const result = await query(sql, [userId, name, level]);
    return result.insertId;
  },

  updateSkill: async (skillId, userId, name, level) => {
    const sql = 'UPDATE skills SET name = ?, level = ? WHERE id = ? AND user_id = ?';
    const result = await query(sql, [name, level, skillId, userId]);
    return result.affectedRows > 0;
  },

  deleteSkill: async (skillId, userId) => {
    const sql = 'DELETE FROM skills WHERE id = ? AND user_id = ?';
    const result = await query(sql, [skillId, userId]);
    return result.affectedRows > 0;
  },

  // ==================== EXPERIENCES ====================

  getExperiences: async (userId) => {
    const sql = 'SELECT * FROM experiences WHERE user_id = ? ORDER BY start_date DESC, created_at DESC';
    return await query(sql, [userId]);
  },

  addExperience: async (userId, data) => {
    const { position, company, start_date, end_date, is_current, description } = data;
    const safeStart = (start_date && start_date.trim && start_date.trim() !== '') ? start_date : null;
    const safeEnd   = (end_date   && end_date.trim   && end_date.trim()   !== '') ? end_date   : null;
    try {
      const sql = `INSERT INTO experiences (user_id, position, company, start_date, end_date, is_current, description) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const result = await query(sql, [userId, position, company, safeStart, safeEnd, is_current || 0, description || null]);
      return result.insertId;
    } catch(e) {
      if (e.code === 'ER_NO_DEFAULT_FOR_FIELD' || e.code === 'WARN_DATA_TRUNCATED' || e.message.includes('start_date')) {
        const today = new Date().toISOString().split('T')[0];
        const sql2 = `INSERT INTO experiences (user_id, position, company, start_date, end_date, is_current, description) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const result = await query(sql2, [userId, position, company, today, safeEnd, is_current || 0, description || null]);
        return result.insertId;
      }
      throw e;
    }
  },

  updateExperience: async (expId, userId, data) => {
    const { position, company, start_date, end_date, is_current, description } = data;
    const sql = `
      UPDATE experiences
      SET position = ?, company = ?, start_date = ?, end_date = ?, is_current = ?, description = ?
      WHERE id = ? AND user_id = ?
    `;
    const result = await query(sql, [position, company, start_date, end_date, is_current, description, expId, userId]);
    return result.affectedRows > 0;
  },

  deleteExperience: async (expId, userId) => {
    const sql = 'DELETE FROM experiences WHERE id = ? AND user_id = ?';
    const result = await query(sql, [expId, userId]);
    return result.affectedRows > 0;
  },

  // ==================== EDUCATIONS ====================

  getEducations: async (userId) => {
    const sql = 'SELECT * FROM educations WHERE user_id = ? ORDER BY start_year DESC';
    return await query(sql, [userId]);
  },

  addEducation: async (userId, data) => {
    const { school, degree, field_of_study, start_year, end_year, gpa } = data;
    const sql = `
      INSERT INTO educations (user_id, school, degree, field_of_study, start_year, end_year, gpa)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      const result = await query(sql, [userId, school, degree, field_of_study, start_year, end_year, gpa || null]);
      return result.insertId;
    } catch(e) {
      const fallbackSql = 'INSERT INTO educations (user_id, school, degree, field_of_study, start_year, end_year) VALUES (?, ?, ?, ?, ?, ?)';
      const result = await query(fallbackSql, [userId, school, degree, field_of_study, start_year, end_year]);
      return result.insertId;
    }
  },

  updateEducation: async (eduId, userId, data) => {
    const { school, degree, field_of_study, start_year, end_year } = data;
    const sql = `
      UPDATE educations
      SET school = ?, degree = ?, field_of_study = ?, start_year = ?, end_year = ?
      WHERE id = ? AND user_id = ?
    `;
    const result = await query(sql, [school, degree, field_of_study, start_year, end_year, eduId, userId]);
    return result.affectedRows > 0;
  },

  deleteEducation: async (eduId, userId) => {
    const sql = 'DELETE FROM educations WHERE id = ? AND user_id = ?';
    const result = await query(sql, [eduId, userId]);
    return result.affectedRows > 0;
  },

  // ==================== PORTFOLIOS ====================

  getPortfolios: async (userId) => {
    const sql = 'SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC';
    return await query(sql, [userId]);
  },

  addPortfolio: async (userId, data) => {
    const { title, description, url, github_url, image_url } = data;
    const sql = `
      INSERT INTO portfolios (user_id, title, description, url, github_url, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [userId, title, description, url, github_url, image_url]);
    return result.insertId;
  },

  updatePortfolio: async (portfolioId, userId, data) => {
    const { title, description, url, github_url, image_url } = data;
    const sql = `
      UPDATE portfolios
      SET title = ?, description = ?, url = ?, github_url = ?, image_url = ?
      WHERE id = ? AND user_id = ?
    `;
    const result = await query(sql, [title, description, url, github_url, image_url, portfolioId, userId]);
    return result.affectedRows > 0;
  },

  deletePortfolio: async (portfolioId, userId) => {
    const sql = 'DELETE FROM portfolios WHERE id = ? AND user_id = ?';
    const result = await query(sql, [portfolioId, userId]);
    return result.affectedRows > 0;
  },

  // Check if a portfolio belongs to a user
  getPortfolioById: async (portfolioId, userId) => {
    const sql = 'SELECT * FROM portfolios WHERE id = ? AND user_id = ?';
    const results = await query(sql, [portfolioId, userId]);
    return results[0] || null;
  },

  // ==================== PRIVACY SETTINGS ====================

  getPrivacySettings: async (userId) => {
    const sql = 'SELECT * FROM user_privacy_settings WHERE user_id = ?';
    const results = await query(sql, [userId]);

    if (results.length === 0) {
      const insertSql = `
        INSERT INTO user_privacy_settings (user_id, hide_email_from_hr, hide_phone_from_hr, require_approval_for_contact)
        VALUES (?, TRUE, TRUE, TRUE)
      `;
      await query(insertSql, [userId]);
      return { hide_email_from_hr: true, hide_phone_from_hr: true, require_approval_for_contact: true };
    }

    return results[0];
  },

  updatePrivacySettings: async (userId, settings) => {
    const { hide_email_from_hr, hide_phone_from_hr, require_approval_for_contact } = settings;
    const sql = `
      INSERT INTO user_privacy_settings (user_id, hide_email_from_hr, hide_phone_from_hr, require_approval_for_contact)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        hide_email_from_hr = VALUES(hide_email_from_hr),
        hide_phone_from_hr = VALUES(hide_phone_from_hr),
        require_approval_for_contact = VALUES(require_approval_for_contact)
    `;
    await query(sql, [userId, hide_email_from_hr, hide_phone_from_hr, require_approval_for_contact]);
    return true;
  },

  // ==================== CALCULATE PROFILE COMPLETENESS ====================

  calculateCompleteness: async (userId) => {
    const user = await query('SELECT profile_image, banner_image, banner_color, bio FROM users WHERE id = ?', [userId]);
    if (!user[0]) return 0;

    let completeness = 10;

    if (user[0].profile_image) completeness += 10;
    if (user[0].banner_image || user[0].banner_color) completeness += 10;
    if (user[0].bio) completeness += 10;

    // Combined query for better performance
    const counts = await query(`
      SELECT
        (SELECT COUNT(*) FROM skills WHERE user_id = ?) as skill_count,
        (SELECT COUNT(*) FROM experiences WHERE user_id = ?) as exp_count,
        (SELECT COUNT(*) FROM educations WHERE user_id = ?) as edu_count,
        (SELECT COUNT(*) FROM portfolios WHERE user_id = ?) as portfolio_count
    `, [userId, userId, userId, userId]);

    if (counts[0].skill_count > 0) completeness += 15;
    if (counts[0].exp_count > 0) completeness += 20;
    if (counts[0].edu_count > 0) completeness += 15;
    if (counts[0].portfolio_count > 0) completeness += 10;

    return Math.min(completeness, 100);
  }
};

module.exports = Profile;

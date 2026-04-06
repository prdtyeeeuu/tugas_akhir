/**
 * Profile Model
 * Mengelola semua operasi database terkait structured profile
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

  updateSkill: async (skillId, name, level) => {
    const sql = 'UPDATE skills SET name = ?, level = ? WHERE id = ?';
    await query(sql, [name, level, skillId]);
    return true;
  },

  deleteSkill: async (skillId) => {
    const sql = 'DELETE FROM skills WHERE id = ?';
    await query(sql, [skillId]);
    return true;
  },

  // ==================== EXPERIENCES ====================

  getExperiences: async (userId) => {
    const sql = 'SELECT * FROM experiences WHERE user_id = ? ORDER BY start_date DESC';
    return await query(sql, [userId]);
  },

  addExperience: async (userId, data) => {
    const { position, company, start_date, end_date, is_current, description } = data;
    const sql = `
      INSERT INTO experiences (user_id, position, company, start_date, end_date, is_current, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [userId, position, company, start_date, end_date, is_current, description]);
    return result.insertId;
  },

  updateExperience: async (expId, data) => {
    const { position, company, start_date, end_date, is_current, description } = data;
    const sql = `
      UPDATE experiences 
      SET position = ?, company = ?, start_date = ?, end_date = ?, is_current = ?, description = ?
      WHERE id = ?
    `;
    await query(sql, [position, company, start_date, end_date, is_current, description, expId]);
    return true;
  },

  deleteExperience: async (expId) => {
    const sql = 'DELETE FROM experiences WHERE id = ?';
    await query(sql, [expId]);
    return true;
  },

  // ==================== EDUCATIONS ====================

  getEducations: async (userId) => {
    const sql = 'SELECT * FROM educations WHERE user_id = ? ORDER BY start_year DESC';
    return await query(sql, [userId]);
  },

  addEducation: async (userId, data) => {
    const { school, degree, field_of_study, start_year, end_year } = data;
    const sql = `
      INSERT INTO educations (user_id, school, degree, field_of_study, start_year, end_year)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [userId, school, degree, field_of_study, start_year, end_year]);
    return result.insertId;
  },

  updateEducation: async (eduId, data) => {
    const { school, degree, field_of_study, start_year, end_year } = data;
    const sql = `
      UPDATE educations 
      SET school = ?, degree = ?, field_of_study = ?, start_year = ?, end_year = ?
      WHERE id = ?
    `;
    await query(sql, [school, degree, field_of_study, start_year, end_year, eduId]);
    return true;
  },

  deleteEducation: async (eduId) => {
    const sql = 'DELETE FROM educations WHERE id = ?';
    await query(sql, [eduId]);
    return true;
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

  updatePortfolio: async (portfolioId, data) => {
    const { title, description, url, github_url, image_url } = data;
    const sql = `
      UPDATE portfolios 
      SET title = ?, description = ?, url = ?, github_url = ?, image_url = ?
      WHERE id = ?
    `;
    await query(sql, [title, description, url, github_url, image_url, portfolioId]);
    return true;
  },

  deletePortfolio: async (portfolioId) => {
    const sql = 'DELETE FROM portfolios WHERE id = ?';
    await query(sql, [portfolioId]);
    return true;
  },

  // ==================== PRIVACY SETTINGS ====================

  getPrivacySettings: async (userId) => {
    const sql = 'SELECT * FROM user_privacy_settings WHERE user_id = ?';
    const results = await query(sql, [userId]);
    
    if (results.length === 0) {
      // Create default settings
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

    let completeness = 10; // Base for registration

    // Basic info (30 points)
    if (user[0].profile_image) completeness += 10;
    if (user[0].banner_image || user[0].banner_color) completeness += 10;
    if (user[0].bio) completeness += 10;

    // Skills (15 points)
    const skills = await query('SELECT COUNT(*) as count FROM skills WHERE user_id = ?', [userId]);
    if (skills[0].count > 0) completeness += 15;

    // Experience (20 points)
    const experiences = await query('SELECT COUNT(*) as count FROM experiences WHERE user_id = ?', [userId]);
    if (experiences[0].count > 0) completeness += 20;

    // Education (15 points)
    const educations = await query('SELECT COUNT(*) as count FROM educations WHERE user_id = ?', [userId]);
    if (educations[0].count > 0) completeness += 15;

    // Portfolio (10 points)
    const portfolios = await query('SELECT COUNT(*) as count FROM portfolios WHERE user_id = ?', [userId]);
    if (portfolios[0].count > 0) completeness += 10;

    return Math.min(completeness, 100);
  }
};

module.exports = Profile;

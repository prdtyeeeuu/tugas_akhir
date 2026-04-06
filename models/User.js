/**
 * User Model
 * Mengelola semua operasi database terkait user
 */
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  /**
   * Membuat user baru ke database
   * @param {object} userData - { name, email, password }
   * @returns {Promise} - ID user yang baru dibuat
   */
  create: async (userData) => {
    const { name, email, password, role } = userData;

    // Hash password dengan bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `;

    const result = await query(sql, [name, email, hashedPassword, role || 'job_seeker']);
    return result.insertId;
  },

  /**
   * Mencari user berdasarkan email
   * @param {string} email - Email user
   * @returns {Promise} - Data user
   */
  findByEmail: async (email) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const results = await query(sql, [email]);
    return results[0] || null;
  },

  /**
   * Mencari user berdasarkan ID
   * @param {number} id - ID user
   * @returns {Promise} - Data user
   */
  findById: async (id) => {
    const sql = 'SELECT id, name, email, role, profile_image, banner_image, banner_color, bio, created_at FROM users WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  },

  /**
   * Mengupdate profil user
   * @param {number} id - ID user
   * @param {object} updateData - Data yang akan diupdate
   * @returns {Promise} - Hasil update
   */
  update: async (id, updateData) => {
    const fields = [];
    const values = [];

    // Build dynamic query berdasarkan field yang ada
    for (const [key, value] of Object.entries(updateData)) {
      // Allow null values for nullable fields (profile_image, banner_image, banner_color)
      const nullableFields = ['profile_image', 'banner_image', 'banner_color', 'bio'];
      
      // Skip only if value is undefined
      // Allow null for nullable fields, skip null for non-nullable fields
      if (value === undefined) continue;
      if (value === null && !nullableFields.includes(key)) continue;
      
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

    await query(sql, values);
    return true;
  },

  /**
   * Verifikasi password user
   * @param {string} password - Password input
   * @param {string} hashedPassword - Password hash dari database
   * @returns {Promise<boolean>} - True jika password cocok
   */
  verifyPassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  }
};

module.exports = User;

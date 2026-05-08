/**
 * Category Model
 * Mengelola data kategori pekerjaan.
 */
const { query } = require('../config/db');

const Category = {
  findAll: async () => {
    const sql = `
      SELECT id, name, icon_name, is_popular
      FROM categories
      ORDER BY is_popular DESC, name ASC
    `;

    return await query(sql);
  },

  findPopular: async () => {
    const sql = `
      SELECT id, name, icon_name, is_popular
      FROM categories
      WHERE is_popular = TRUE
      ORDER BY id ASC
    `;

    return await query(sql);
  },

  findByIds: async (ids = []) => {
    const categoryIds = ids
      .map(id => parseInt(id, 10))
      .filter(Number.isInteger);

    if (categoryIds.length === 0) {
      return [];
    }

    const placeholders = categoryIds.map(() => '?').join(', ');
    const sql = `
      SELECT id, name, icon_name, is_popular
      FROM categories
      WHERE id IN (${placeholders})
      ORDER BY name ASC
    `;

    return await query(sql, categoryIds);
  }
};

module.exports = Category;

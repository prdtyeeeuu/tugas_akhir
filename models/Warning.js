const { query, rawQuery } = require('../config/db');

const Warning = {
  findByUserId: async (userId, limit = 5) => {
    const safeLimit = Math.min(50, Math.max(parseInt(limit, 10) || 5, 1));
    const rows = await rawQuery(
      `SELECT id, message, created_at
       FROM warnings
       WHERE user_id = ?
         AND acknowledged_at IS NULL
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, safeLimit]
    );

    return rows;
  },

  acknowledge: async (warningId, userId) => {
    const result = await query(
      `UPDATE warnings
       SET acknowledged_at = NOW()
       WHERE id = ?
         AND user_id = ?
         AND acknowledged_at IS NULL`,
      [warningId, userId]
    );

    return result.affectedRows > 0;
  },

  countByUserId: async (userId) => {
    const rows = await query(
      'SELECT COUNT(*) as total FROM warnings WHERE user_id = ?',
      [userId]
    );

    return rows[0]?.total || 0;
  }
};

module.exports = Warning;

/**
 * Database Configuration
 * Mengelola koneksi ke MySQL menggunakan connection pool
 */
const mysql = require('mysql2');
const config = require('./config');

// Membuat connection pool untuk performa lebih baik
const pool = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export promise-based connection
const promisePool = pool.promise();

/**
 * Fungsi untuk menjalankan query
 * @param {string} sql - Query SQL
 * @param {array} params - Parameter query (optional)
 * @returns {Promise} - Hasil query
 */
const query = async (sql, params = []) => {
  try {
    const [results] = await promisePool.execute(sql, params);
    return results;
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Database query error', { sql: sql.substring(0, 100), error: error.message });
    throw error;
  }
};

/**
 * Fungsi rawQuery menggunakan .query() bukan .execute()
 * Digunakan untuk query dengan LIMIT/OFFSET dinamis agar tidak error di prepared statement
 */
const rawQuery = async (sql, params = []) => {
  try {
    const [results] = await promisePool.query(sql, params);
    return results;
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Database rawQuery error', { sql: sql.substring(0, 100), error: error.message });
    throw error;
  }
};

module.exports = { pool: promisePool, query, rawQuery };

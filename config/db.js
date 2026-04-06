/**
 * Database Configuration
 * Mengelola koneksi ke MySQL menggunakan connection pool
 */
const mysql = require('mysql2');
require('dotenv').config();

// Membuat connection pool untuk performa lebih baik
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lokerin_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export promise-based connection
const promisePool = pool.promise();

module.exports = promisePool;

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
    console.error('Database error:', error);
    throw error;
  }
};

module.exports = { pool: promisePool, query };

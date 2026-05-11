require('dotenv').config();
const { pool } = require('../../config/db');

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return rows[0].total > 0;
}

async function migrate() {
  if (!(await columnExists('applications', 'rejection_reason'))) {
    await pool.query('ALTER TABLE applications ADD COLUMN rejection_reason TEXT DEFAULT NULL AFTER document_path');
    console.log('applications.rejection_reason column added.');
  } else {
    console.log('applications.rejection_reason already exists, skipped.');
  }

  await pool.query(`
    ALTER TABLE applications
    MODIFY COLUMN status ENUM(
      'applied',
      'interviewing',
      'offered',
      'accepted',
      'declined',
      'rejected',
      'expired',
      'withdrawn'
    ) DEFAULT 'applied'
  `);
  console.log('applications.status enum updated.');
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

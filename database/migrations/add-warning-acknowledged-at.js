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
  if (await columnExists('warnings', 'acknowledged_at')) {
    console.log('warnings.acknowledged_at already exists, skipped.');
    return;
  }

  await pool.query('ALTER TABLE warnings ADD COLUMN acknowledged_at DATETIME DEFAULT NULL AFTER created_at');
  console.log('warnings.acknowledged_at column added.');
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 8889,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'locker_db',
  multipleStatements: true
};

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) as total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].total > 0;
}

async function migrate() {
  let conn;

  try {
    console.log('Updating applications workflow columns...');
    conn = await mysql.createConnection(dbConfig);

    await conn.query(`
      ALTER TABLE applications
      MODIFY COLUMN status ENUM(
        'pending',
        'review',
        'interview',
        'diterima',
        'ditolak',
        'offering',
        'applied',
        'interviewing',
        'offered',
        'accepted',
        'declined',
        'expired',
        'withdrawn'
      ) DEFAULT 'applied'
    `);

    await conn.query(`
      UPDATE applications
      SET status = CASE status
        WHEN 'pending' THEN 'applied'
        WHEN 'review' THEN 'applied'
        WHEN 'interview' THEN 'interviewing'
        WHEN 'offering' THEN 'offered'
        WHEN 'diterima' THEN 'accepted'
        WHEN 'ditolak' THEN 'declined'
        ELSE status
      END
    `);

    await conn.query(`
      ALTER TABLE applications
      MODIFY COLUMN status ENUM(
        'applied',
        'interviewing',
        'offered',
        'accepted',
        'declined',
        'expired',
        'withdrawn'
      ) DEFAULT 'applied'
    `);

    if (!(await columnExists(conn, 'applications', 'expired_at'))) {
      await conn.query('ALTER TABLE applications ADD COLUMN expired_at DATETIME NULL AFTER updated_at');
      console.log('Added applications.expired_at');
    }

    if (!(await columnExists(conn, 'applications', 'document_path'))) {
      await conn.query('ALTER TABLE applications ADD COLUMN document_path VARCHAR(255) NULL AFTER expired_at');
      console.log('Added applications.document_path');
    }

    console.log('Applications workflow migration completed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

migrate();

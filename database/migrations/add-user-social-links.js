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
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'locker_db'
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

async function addColumnIfMissing(conn, column, definition) {
  if (await columnExists(conn, 'users', column)) {
    console.log(`users.${column} already exists, skipped.`);
    return;
  }

  await conn.query(`ALTER TABLE users ADD COLUMN ${column} ${definition}`);
  console.log(`users.${column} column added.`);
}

async function migrate() {
  let conn;

  try {
    console.log('Adding user social link columns...');
    conn = await mysql.createConnection(dbConfig);

    await addColumnIfMissing(conn, 'instagram_url', 'VARCHAR(500) DEFAULT NULL AFTER address');
    await addColumnIfMissing(conn, 'github_url', 'VARCHAR(500) DEFAULT NULL AFTER instagram_url');
    await addColumnIfMissing(conn, 'twitter_url', 'VARCHAR(500) DEFAULT NULL AFTER github_url');

    console.log('User social link migration completed.');
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

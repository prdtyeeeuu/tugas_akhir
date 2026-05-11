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
  database: process.env.DB_NAME || 'locker_db'
};

async function migrate() {
  let conn;

  try {
    console.log('Adding requirements column to jobs...');
    conn = await mysql.createConnection(dbConfig);

    try {
      await conn.query('ALTER TABLE jobs ADD COLUMN requirements TEXT DEFAULT NULL AFTER deadline');
      console.log('requirements column added.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('requirements column already exists, skipped.');
      } else {
        throw err;
      }
    }
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

/**
 * Migration: Add extended profile columns to users table
 * Cara menjalankan: node database/migrations/add-profile-columns.js
 */
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Manual .env loading
const envPath = path.join(__dirname, '..', '..', '.env');
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

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'locker_db'
};

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Running migration: Add profile columns...\n');
    connection = mysql.createConnection(dbConfig);

    await new Promise((resolve, reject) => {
      connection.connect(err => {
        if (err) { console.error('❌ Connect failed:', err.message); reject(err); }
        else { console.log('✅ Connected\n'); resolve(); }
      });
    });

    const alterStatements = [
      "ALTER TABLE users ADD COLUMN address VARCHAR(255) DEFAULT NULL AFTER phone",
      "ALTER TABLE users ADD COLUMN expected_salary_min INT DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN expected_salary_max INT DEFAULT NULL",
      "ALTER TABLE users ADD COLUMN open_to_work TINYINT(1) DEFAULT 1",
      "ALTER TABLE users ADD COLUMN work_preferences TEXT DEFAULT NULL",
      "ALTER TABLE educations ADD COLUMN gpa VARCHAR(10) DEFAULT NULL"
    ];

    for (const sql of alterStatements) {
      try {
        await connection.promise().query(sql);
        console.log(`✅ OK: ${sql.split('ADD COLUMN')[1]?.split(' ')[1] || sql}`);
      } catch(err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists, skipping`);
        } else {
          console.error(`❌ Error:`, err.message);
        }
      }
    }

    console.log('\n✅ Migration selesai!');
  } catch(err) {
    console.error('❌ Migration gagal:', err.message);
  } finally {
    if (connection) connection.end();
  }
}

runMigration();

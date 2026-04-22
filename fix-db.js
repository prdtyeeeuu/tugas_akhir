/**
 * Auto-fix: Jalankan file ini sekali untuk memperbaiki struktur DB
 * node fix-db.js
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.substring(0, eqIdx).trim();
      const val = line.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
});

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lokerin_db'
};

console.log('🔗 Connecting to DB:', dbConfig.host, dbConfig.port, dbConfig.database);

async function fix() {
  const conn = await mysql.createConnection(dbConfig);
  console.log('✅ Connected!\n');

  const steps = [
    // Create skills table
    `CREATE TABLE IF NOT EXISTS skills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      level ENUM('Beginner','Intermediate','Advanced','Expert') DEFAULT 'Intermediate',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Create experiences table (start_date nullable from the start)
    `CREATE TABLE IF NOT EXISTS experiences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      position VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      start_date DATE DEFAULT NULL,
      end_date DATE DEFAULT NULL,
      is_current TINYINT(1) DEFAULT 0,
      description TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Create educations table (with gpa)
    `CREATE TABLE IF NOT EXISTS educations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      school VARCHAR(255) NOT NULL,
      degree VARCHAR(255) DEFAULT NULL,
      field_of_study VARCHAR(255) DEFAULT NULL,
      start_year YEAR DEFAULT NULL,
      end_year YEAR DEFAULT NULL,
      gpa VARCHAR(10) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Fix experiences.start_date: allow NULL if column exists but was NOT NULL
    `ALTER TABLE experiences MODIFY COLUMN start_date DATE DEFAULT NULL`,

    // Add phone to users
    `ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email`,
    // Add address
    `ALTER TABLE users ADD COLUMN address VARCHAR(255) DEFAULT NULL`,
    // Add salary
    `ALTER TABLE users ADD COLUMN expected_salary_min INT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN expected_salary_max INT DEFAULT NULL`,
    // Add open_to_work
    `ALTER TABLE users ADD COLUMN open_to_work TINYINT(1) DEFAULT 1`,
    // Add work_preferences
    `ALTER TABLE users ADD COLUMN work_preferences TEXT DEFAULT NULL`,
    // Add gpa to educations
    `ALTER TABLE educations ADD COLUMN gpa VARCHAR(10) DEFAULT NULL`,
    
    // Add deadline to jobs
    `ALTER TABLE jobs ADD COLUMN deadline DATE DEFAULT NULL`,
  ];

  let ok = 0, skip = 0, fail = 0;
  for (const sql of steps) {
    try {
      await conn.query(sql);
      ok++;
      const preview = sql.replace(/\s+/g, ' ').substring(0, 60);
      console.log(`  ✅ OK: ${preview}...`);
    } catch(e) {
      if (['ER_DUP_FIELDNAME','ER_TABLE_EXISTS_ERROR'].includes(e.code)) {
        skip++;
        console.log(`  ⚠️  Skip (already exists)`);
      } else {
        fail++;
        console.error(`  ❌ FAIL: ${e.message}`);
      }
    }
  }

  await conn.end();
  console.log(`\n📊 Done: ${ok} ok, ${skip} skipped, ${fail} failed`);
  console.log('\n✨ Selesai! Restart server Anda sekarang.');
}

fix().catch(e => {
  console.error('❌ Fatal error:', e.message);
  console.log('\nPastikan MySQL sudah berjalan dan konfigurasi .env sudah benar.');
  process.exit(1);
});

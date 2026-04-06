/**
 * Migration: Create all profile-related tables
 * Creates: skills, experiences, educations, portfolios, user_privacy_settings, cvs
 * 
 * Cara menjalankan: node database/migrations/create-profile-tables.js
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
    console.log('🔄 Running migration: Create profile tables...\n');

    connection = mysql.createConnection(dbConfig);
    
    console.log('📡 Connecting to database...');
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          console.error('❌ Failed to connect:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to database\n');
          resolve();
        }
      });
    });

    const tables = [
      // Skills Table
      `CREATE TABLE IF NOT EXISTS skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') DEFAULT 'Intermediate',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Experiences Table
      `CREATE TABLE IF NOT EXISTS experiences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        position VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE DEFAULT NULL,
        is_current BOOLEAN DEFAULT FALSE,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Educations Table
      `CREATE TABLE IF NOT EXISTS educations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        school VARCHAR(255) NOT NULL,
        degree VARCHAR(255) DEFAULT NULL,
        field_of_study VARCHAR(255) DEFAULT NULL,
        start_year YEAR NOT NULL,
        end_year YEAR DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Portfolios Table
      `CREATE TABLE IF NOT EXISTS portfolios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        url VARCHAR(500) DEFAULT NULL,
        github_url VARCHAR(500) DEFAULT NULL,
        image_url VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // User Privacy Settings
      `CREATE TABLE IF NOT EXISTS user_privacy_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        hide_email_from_hr BOOLEAN DEFAULT TRUE,
        hide_phone_from_hr BOOLEAN DEFAULT TRUE,
        require_approval_for_contact BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // CVs Table
      `CREATE TABLE IF NOT EXISTS cvs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size INT DEFAULT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Contact Requests Table
      `CREATE TABLE IF NOT EXISTS contact_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hr_id INT NOT NULL,
        user_id INT NOT NULL,
        job_id INT DEFAULT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_hr (hr_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // Add columns to applications table
      `ALTER TABLE applications 
       ADD COLUMN cover_letter TEXT DEFAULT NULL AFTER status,
       ADD COLUMN viewed_by_hr BOOLEAN DEFAULT FALSE AFTER cover_letter,
       ADD COLUMN profile_snapshot JSON DEFAULT NULL AFTER viewed_by_hr,
       ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`,

      // Add phone column to users
      `ALTER TABLE users 
       ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email`
    ];

    for (let i = 0; i < tables.length; i++) {
      try {
        await connection.promise().query(tables[i]);
        console.log(`✅ Table ${i + 1}/${tables.length} created/updated`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists, skipping...`);
        } else {
          console.error(`❌ Error on table ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Created Tables:');
    console.log('   - skills');
    console.log('   - experiences');
    console.log('   - educations');
    console.log('   - portfolios');
    console.log('   - user_privacy_settings');
    console.log('   - cvs');
    console.log('   - contact_requests');
    console.log('   - Updated applications table');
    console.log('   - Added phone column to users');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

runMigration();

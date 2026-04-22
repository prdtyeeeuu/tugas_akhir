/**
 * Database Migration & Seed Script
 * Jalankan script ini sekali untuk membuat tabel dan data dummy
 * 
 * Cara menjalankan:
 * node database/seed.js
 */
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Manual .env loading
const envPath = path.join(__dirname, '..', '.env');
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

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root'
};

const DB_NAME = process.env.DB_NAME || 'locker_db';

/**
 * Fungsi untuk menjalankan seed
 */
async function runSeed() {
  let connection;
  let dbConnection;
  
  try {
    console.log('🔄 Memulai proses seed database...\n');

    // 1. Buat koneksi awal (tanpa database)
    connection = mysql.createConnection(dbConfig);
    console.log('📡 Connecting to MySQL...');
    
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          console.error('❌ Failed to connect to MySQL:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to MySQL\n');
          resolve();
        }
      });
    });

    // 2. Buat database jika belum ada
    console.log('📁 Membuat database:', DB_NAME);
    await new Promise((resolve, reject) => {
      connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`, (err) => {
        if (err) {
          console.error('❌ Gagal membuat database:', err.message);
          reject(err);
        } else {
          console.log('✅ Database berhasil dibuat/ditemukan\n');
          resolve();
        }
      });
    });

    connection.end();

    // 3. Buat koneksi baru ke database target
    dbConnection = mysql.createConnection({
      ...dbConfig,
      database: DB_NAME
    });

    console.log('📡 Connecting to database:', DB_NAME);
    await new Promise((resolve, reject) => {
      dbConnection.connect((err) => {
        if (err) {
          console.error('❌ Failed to connect to database:', err.message);
          reject(err);
        } else {
          console.log('✅ Connected to database:', DB_NAME, '\n');
          resolve();
        }
      });
    });

    // 4. Buat tabel-tabel
    await createTables(dbConnection);
    
    // 5. Insert data dummy
    await seedData(dbConnection);
    
    console.log('\n✅ Seed database selesai!');
    console.log('📝 Data dummy telah ditambahkan');
    console.log('\n🔐 Akun dummy:');
    console.log('   Email: user@test.com');
    console.log('   Password: password123');
    console.log('\n🚀 Anda bisa menjalankan aplikasi dengan: npm start\n');

    dbConnection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) connection.end();
    if (dbConnection) dbConnection.end();
    process.exit(1);
  }
}

/**
 * Buat tabel-tabel
 */
async function createTables(conn) {
  console.log('📋 Membuat tabel-tabel...');

  const queries = [
    // Tabel Users (with role and all profile columns from the start)
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('job_seeker', 'hr') DEFAULT 'job_seeker',
      profile_image VARCHAR(255) DEFAULT NULL,
      banner_image VARCHAR(255) DEFAULT NULL,
      banner_color VARCHAR(7) DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      address VARCHAR(255) DEFAULT NULL,
      expected_salary_min INT DEFAULT NULL,
      expected_salary_max INT DEFAULT NULL,
      open_to_work TINYINT(1) DEFAULT 0,
      work_preferences VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Jobs
    `CREATE TABLE IF NOT EXISTS jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT NULL,
      type ENUM('Full-time', 'Part-time', 'Remote', 'Contract', 'Internship') DEFAULT 'Full-time',
      description TEXT DEFAULT NULL,
      salary_min INT DEFAULT NULL,
      salary_max INT DEFAULT NULL,
      hr_id INT DEFAULT NULL,
      company_logo VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_category (category),
      INDEX idx_created_at (created_at DESC),
      INDEX idx_hr_id (hr_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Applications
    `CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_id INT NOT NULL,
      status ENUM('pending', 'diterima', 'ditolak', 'interview') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_job (user_id, job_id),
      INDEX idx_user_id (user_id),
      INDEX idx_job_id (job_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Chat Conversations
    `CREATE TABLE IF NOT EXISTS chat_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      applicant_id INT NOT NULL,
      hr_id INT NOT NULL,
      job_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_conversation (applicant_id, hr_id, job_id),
      INDEX idx_applicant (applicant_id),
      INDEX idx_hr (hr_id),
      INDEX idx_job (job_id),
      FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Chat Messages
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_conversation (conversation_id),
      INDEX idx_receiver (receiver_id),
      INDEX idx_is_read (is_read),
      INDEX idx_conversation_read (conversation_id, receiver_id, is_read),
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Skills
    `CREATE TABLE IF NOT EXISTS skills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      level ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert') DEFAULT 'Intermediate',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Experiences
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
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Educations
    `CREATE TABLE IF NOT EXISTS educations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      school VARCHAR(255) NOT NULL,
      degree VARCHAR(255) DEFAULT NULL,
      field_of_study VARCHAR(255) DEFAULT NULL,
      start_year INT DEFAULT NULL,
      end_year INT DEFAULT NULL,
      gpa DECIMAL(3,2) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Portfolios
    `CREATE TABLE IF NOT EXISTS portfolios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT NULL,
      url VARCHAR(500) DEFAULT NULL,
      github_url VARCHAR(500) DEFAULT NULL,
      image_url VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel User Privacy Settings
    `CREATE TABLE IF NOT EXISTS user_privacy_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      hide_email_from_hr TINYINT(1) DEFAULT TRUE,
      hide_phone_from_hr TINYINT(1) DEFAULT TRUE,
      require_approval_for_contact TINYINT(1) DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (let i = 0; i < queries.length; i++) {
    await new Promise((resolve, reject) => {
      conn.query(queries[i], (err) => {
        if (err) {
          console.error(`❌ Gagal membuat tabel ${i + 1}:`, err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  console.log('✅ Tabel-tabel berhasil dibuat\n');
}

/**
 * Insert data dummy
 */
async function seedData(conn) {
  console.log('🌱 Menambahkan data dummy...');

  // 1. Buat user dummy
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  console.log('   👤 Membuat user dummy...');
  const userId = await insertUser(conn, ['Test User', 'user@test.com', hashedPassword, 'job_seeker']);

  console.log('   👤 Membuat HR user...');
  const hrId = await insertUser(conn, ['HR Company', 'hr@test.com', hashedPassword, 'hr']);

  // 2. Buat jobs dummy
  const jobs = [
    ['Frontend Developer', 'PT Teknologi Maju', 'Jakarta', 'IT', 'Full-time', 'Bertanggung jawab untuk mengembangkan frontend aplikasi web.', hrId],
    ['Backend Developer', 'Startup Digital', 'Bandung', 'IT', 'Remote', 'Mengembangkan dan maintain API dan backend services.', hrId],
    ['UI/UX Designer', 'Creative Agency', 'Surabaya', 'Design', 'Full-time', 'Mendesain user interface dan experience untuk klien.', hrId],
    ['Data Analyst', 'Finance Corp', 'Jakarta', 'Finance', 'Full-time', 'Menganalisis data bisnis dan membuat laporan.', hrId],
    ['Marketing Specialist', 'Retail Indo', 'Yogyakarta', 'Marketing', 'Full-time', 'Mengembangkan strategi marketing dan campaign.', hrId],
    ['HR Manager', 'PT Sukses Bersama', 'Semarang', 'HR', 'Full-time', 'Mengelola dan mengembangkan tim HR.', hrId],
    ['Project Manager', 'Tech Solutions', 'Jakarta', 'Engineering', 'Full-time', 'Memimpin dan mengelola proyek software.', hrId],
    ['Content Writer', 'Media Kreatif', 'Remote', 'Marketing', 'Remote', 'Menulis konten untuk blog dan media sosial.', hrId],
    ['Graphic Designer', 'Design Studio', 'Bandung', 'Design', 'Part-time', 'Membuat desain visual untuk berbagai media.', hrId],
    ['Sales Executive', 'PT Niaga Jaya', 'Surabaya', 'Sales', 'Full-time', 'Mencari dan mengembangkan klien baru.', hrId]
  ];

  console.log('   💼 Membuat job listings...');
  for (const job of jobs) {
    await insertJob(conn, job);
  }

  console.log('✅ Data dummy berhasil ditambahkan');
}

/**
 * Insert user ke database
 */
async function insertUser(conn, userData) {
  return new Promise((resolve, reject) => {
    const role = userData[3] || 'job_seeker';
    conn.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [userData[0], userData[1], userData[2], role],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('   ⚠️  User sudah ada, skip...');
            // Fetch existing user to return ID
            conn.query('SELECT id FROM users WHERE email = ?', [userData[1]], (err2, rows) => {
              if (err2) reject(err2);
              else resolve(rows[0] ? rows[0].id : null);
            });
          } else {
            reject(err);
          }
        } else {
          resolve(result.insertId);
        }
      }
    );
  });
}

/**
 * Insert job ke database
 */
async function insertJob(conn, jobData) {
  return new Promise((resolve, reject) => {
    conn.query(
      'INSERT IGNORE INTO jobs (title, company, location, category, type, description, hr_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      jobData,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Jalankan seed
runSeed();

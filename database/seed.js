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
    // Tabel Users
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      profile_image VARCHAR(255) DEFAULT NULL,
      banner_image VARCHAR(255) DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
      hr_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_category (category),
      INDEX idx_created_at (created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    // Tabel Applications
    `CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_id INT NOT NULL,
      status ENUM('pending', 'diterima', 'ditolak') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_job (user_id, job_id),
      INDEX idx_user_id (user_id),
      INDEX idx_job_id (job_id)
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
  const userId = await insertUser(conn, ['Test User', 'user@test.com', hashedPassword]);
  
  console.log('   👤 Membuat HR user...');
  const hrId = await insertUser(conn, ['HR Company', 'hr@test.com', hashedPassword]);

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
    conn.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      userData,
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('   ⚠️  User sudah ada, skip...');
            resolve(null);
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

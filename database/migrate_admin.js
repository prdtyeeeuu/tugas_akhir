const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Manual .env loading
const envPath = path.join(__dirname, '..', '.env');
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
  port: parseInt(process.env.DB_PORT) || 8889,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'locker_db'
};

async function migrateAdmin() {
  let conn;
  try {
    console.log('🔄 Memulai migrasi untuk admin role...\n');
    
    conn = mysql.createConnection(dbConfig);
    
    await new Promise((resolve, reject) => {
      conn.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ Connected to database\n');

    // Update ENUM for role
    console.log('📋 Mengupdate tabel users (menambahkan role admin)...');
    await new Promise((resolve, reject) => {
      conn.query(
        "ALTER TABLE users MODIFY COLUMN role ENUM('job_seeker', 'hr', 'admin') DEFAULT 'job_seeker'",
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    console.log('✅ Role admin berhasil ditambahkan ke skema.\n');

    // Insert dummy admin
    console.log('👤 Menambahkan default admin user...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    await new Promise((resolve, reject) => {
      conn.query(
        "INSERT INTO users (name, email, password, role) VALUES ('Admin System', 'admin@test.com', ?, 'admin') ON DUPLICATE KEY UPDATE role='admin'",
        [hashedPassword],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    console.log('✅ Default admin user berhasil dibuat (admin@test.com / password123).\n');

    console.log('🎉 Migrasi selesai!');
  } catch (err) {
    console.error('❌ Error:', err.message, err.code);
  } finally {
    if (conn && conn.state !== 'disconnected') {
      try { conn.end(); } catch(e) {}
    }
  }
}

migrateAdmin();

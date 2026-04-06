/**
 * Migration: Add 'role' column to users table
 * Run this script to distinguish between Job Seekers and HR
 * 
 * Cara menjalankan: node database/migrations/add-user-role.js
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

// Database configuration
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
    console.log('🔄 Running migration: Add user role...\n');

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

    // Add role column after password
    const addRole = `
      ALTER TABLE users 
      ADD COLUMN role VARCHAR(20) DEFAULT 'job_seeker' 
      AFTER password
    `;
    
    try {
      await connection.promise().query(addRole);
      console.log('✅ Added role column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column role already exists, skipping...');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('👉 Roles available: "job_seeker", "hr"');

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

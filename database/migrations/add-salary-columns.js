/**
 * Migration: Add salary columns to jobs table
 * Run this script to add salary range support
 * 
 * Cara menjalankan: node database/migrations/add-salary-columns.js
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
    console.log('🔄 Running migration: Add salary columns...\n');

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

    // Add salary_min column
    const addSalaryMin = `
      ALTER TABLE jobs 
      ADD COLUMN salary_min INT DEFAULT NULL 
      AFTER description
    `;
    
    try {
      await connection.promise().query(addSalaryMin);
      console.log('✅ Added salary_min column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column salary_min already exists, skipping...');
      } else {
        throw err;
      }
    }

    // Add salary_max column
    const addSalaryMax = `
      ALTER TABLE jobs 
      ADD COLUMN salary_max INT DEFAULT NULL 
      AFTER salary_min
    `;
    
    try {
      await connection.promise().query(addSalaryMax);
      console.log('✅ Added salary_max column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column salary_max already exists, skipping...');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migration completed successfully!');

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

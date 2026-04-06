/**
 * Migration: Add banner_color column to users table
 * Run this script to add banner color support
 * 
 * Cara menjalankan: node database/migrations/add-banner-color.js
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
    console.log('🔄 Running migration: Add banner_color column...\n');

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

    // Check if column already exists
    const checkColumn = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'banner_color'
    `;
    
    const [rows] = await connection.promise().query(checkColumn, [dbConfig.database]);
    
    if (rows.length > 0) {
      console.log('⚠️  Column banner_color already exists, skipping...');
    } else {
      // Add banner_color column
      const addColumn = `
        ALTER TABLE users 
        ADD COLUMN banner_color VARCHAR(7) DEFAULT NULL 
        AFTER banner_image
      `;
      
      await connection.promise().query(addColumn);
      console.log('✅ Added banner_color column to users table');
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

/**
 * Migration: Create chat_messages table
 * Run this script to create the chat system tables
 * 
 * Cara menjalankan: node database/migrations/create-chat-tables.js
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
    console.log('🔄 Running migration: Create chat tables...\n');

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

    // Create chat_conversations table
    const createConversations = `
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        applicant_id INT NOT NULL,
        hr_id INT NOT NULL,
        job_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_conversation (applicant_id, hr_id, job_id),
        INDEX idx_applicant (applicant_id),
        INDEX idx_hr (hr_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    
    await connection.promise().query(createConversations);
    console.log('✅ Created chat_conversations table');

    // Create chat_messages table
    const createMessages = `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation (conversation_id),
        INDEX idx_sender (sender_id),
        INDEX idx_receiver (receiver_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    
    await connection.promise().query(createMessages);
    console.log('✅ Created chat_messages table');

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

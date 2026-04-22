/**
 * Application Configuration
 * Centralized configuration for secrets, constants, and app settings
 */
require('dotenv').config();

// JWT Secret - MUST be set via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in .env! Using default secret is INSECURE for production.');
}

module.exports = {
  // Authentication
  JWT_SECRET: JWT_SECRET || 'lokerin-session-secret-key-2024-change-in-production',
  JWT_EXPIRY: '7d',

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'lokerin-session-secret-2024-change-in-production',
  SESSION_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'lokerin_db',
  DB_PORT: parseInt(process.env.DB_PORT) || 3306,

  // Upload limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: /jpeg|jpg|png|gif|webp/,

  // Allowed roles
  VALID_ROLES: ['job_seeker', 'hr'],

  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'],

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100, // requests per window
  RATE_LIMIT_LOGIN_MAX: 10, // login attempts per window
};

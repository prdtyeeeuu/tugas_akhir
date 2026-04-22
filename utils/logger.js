/**
 * Logger Utility
 * Structured logging for production use
 * Replaces console.log/console.error with proper logging
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');
const errorLogFile = path.join(logsDir, 'error.log');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

function writeToFile(filePath, message) {
  try {
    fs.appendFileSync(filePath, message + '\n');
  } catch (err) {
    // Silently fail if file write fails
  }
}

const logger = {
  debug: (message, meta = {}) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      const formatted = formatMessage('DEBUG', message, meta);
      console.log(formatted);
    }
  },

  info: (message, meta = {}) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage('INFO', message, meta);
      console.log(formatted);
      writeToFile(logFile, formatted);
    }
  },

  warn: (message, meta = {}) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      const formatted = formatMessage('WARN', message, meta);
      console.warn(formatted);
      writeToFile(logFile, formatted);
    }
  },

  error: (message, meta = {}) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      const formatted = formatMessage('ERROR', message, meta);
      console.error(formatted);
      writeToFile(logFile, formatted);
      writeToFile(errorLogFile, formatted);
    }
  },

  // HTTP request logger
  http: (req, res, time) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} - ${time}ms`);
      console.log(formatted);
      writeToFile(logFile, formatted);
    }
  }
};

module.exports = logger;

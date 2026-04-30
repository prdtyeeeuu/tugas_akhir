/**
 * Multer Upload Middleware
 * Centralized file upload configuration
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

/**
 * Create upload directory if it doesn't exist
 * @param {string} dirPath - Directory path
 */
function ensureUploadDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Create multer storage configuration
 * @param {string} destination - Upload destination directory
 * @returns {multer.StorageEngine} - Storage engine
 */
function createStorage(destination) {
  ensureUploadDir(destination);

  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, destination);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  });
}

/**
 * File filter for images
 */
function imageFileFilter(req, file, cb) {
  const allowedTypes = config.ALLOWED_IMAGE_TYPES;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan (jpeg, jpg, png, gif, webp)'));
  }
}

/**
 * Create multer upload instance
 * @param {string} destination - Upload destination directory
 * @param {number} maxSize - Max file size in bytes (default: 5MB)
 * @returns {multer.Multer} - Multer instance
 */
function createUpload(destination, maxSize = config.MAX_FILE_SIZE) {
  return multer({
    storage: createStorage(destination),
    limits: { fileSize: maxSize },
    fileFilter: imageFileFilter
  });
}

/**
 * File filter for documents & images
 */
function docFileFilter(req, file, cb) {
  const allowedTypes = /pdf|doc|docx|png|jpg|jpeg|webp|gif/i;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Hanya file dokumen (pdf, doc, docx) atau gambar yang diperbolehkan'));
  }
}

/**
 * Create multer upload instance for docs
 */
function createDocUpload(destination, maxSize = config.MAX_FILE_SIZE) {
  return multer({
    storage: createStorage(destination),
    limits: { fileSize: maxSize },
    fileFilter: docFileFilter
  });
}

// Pre-configured upload instances
const uploadPaths = {
  profiles: path.join(__dirname, '../public/images/profiles'),
  banners: path.join(__dirname, '../public/images/banners'),
  portfolios: path.join(__dirname, '../public/images/portfolios'),
  companies: path.join(__dirname, '../public/images/companies'),
  cvs: path.join(__dirname, '../public/images/cvs'),
  offerings: path.join(__dirname, '../public/documents/offerings')
};

// Ensure all upload directories exist
Object.values(uploadPaths).forEach(ensureUploadDir);

module.exports = {
  // Pre-configured uploaders
  profileImage: createUpload(uploadPaths.profiles),
  bannerImage: createUpload(uploadPaths.banners),
  portfolioImage: createUpload(uploadPaths.portfolios),
  companyLogo: createUpload(uploadPaths.companies),
  cvImage: createUpload(uploadPaths.cvs),
  offeringDoc: createDocUpload(uploadPaths.offerings),

  // Generic uploader for custom destinations
  createUpload,
  createStorage,
  imageFileFilter,
  ensureUploadDir,
  uploadPaths
};

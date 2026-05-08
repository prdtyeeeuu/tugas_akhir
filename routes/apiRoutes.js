/**
 * API Routes
 * Endpoint JSON ringan untuk kebutuhan frontend.
 */
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/categories/popular', categoryController.getPopularCategories);
router.get('/categories/all', categoryController.getAllCategories);
router.get('/categories', categoryController.getAllCategories);

module.exports = router;

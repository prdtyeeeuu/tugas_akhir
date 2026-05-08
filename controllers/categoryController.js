/**
 * Category Controller
 * Endpoint API untuk kategori pekerjaan.
 */
const Category = require('../models/Category');

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat kategori'
    });
  }
};

const getPopularCategories = async (req, res) => {
  try {
    const categories = await Category.findPopular();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get popular categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat kategori populer'
    });
  }
};

module.exports = {
  getAllCategories,
  getPopularCategories
};

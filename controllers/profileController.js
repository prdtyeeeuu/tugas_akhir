/**
 * Profile Controller
 * Menangani tampilan dan update profil user
 */
const User = require('../models/User');
const Profile = require('../models/Profile');
const Application = require('../models/Application');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Pastikan folder upload ada
const uploadDirs = [
  path.join(__dirname, '../public/images/profiles'),
  path.join(__dirname, '../public/images/banners'),
  path.join(__dirname, '../public/uploads/profiles'),
  path.join(__dirname, '../public/uploads/banners'),
  path.join(__dirname, '../public/uploads/portfolios')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

/**
 * Menampilkan halaman profil
 */
const showProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil data user
    const user = await User.findById(userId);

    if (!user) {
      return res.redirect('/login');
    }

    // Ambil semua structured profile data dan statistik secara paralel
    const [skills, experiences, educations, portfolios, privacySettings, stats] = await Promise.all([
      Profile.getSkills(userId),
      Profile.getExperiences(userId),
      Profile.getEducations(userId),
      Profile.getPortfolios(userId),
      Profile.getPrivacySettings(userId),
      Application.getStats(userId)
    ]);

    // Hitung kelengkapan profil
    const completeness = await Profile.calculateCompleteness(userId);

    // Ambil profile data untuk lokasi
    const profile = {
      location: '-',
      instagram: req.user.instagram_url || null,
      github: req.user.github_url || null,
      twitter: req.user.twitter_url || null
    };

    // Daftar warna banner yang tersedia
    const bannerColors = [
      { value: '#667eea', label: 'Purple Blue' },
      { value: '#f093fb', label: 'Pink' },
      { value: '#4facfe', label: 'Sky Blue' },
      { value: '#43e97b', label: 'Green' },
      { value: '#fa709a', label: 'Rose' },
      { value: '#fee140', label: 'Yellow' },
      { value: '#30cfd0', label: 'Cyan' },
      { value: '#a8edea', label: 'Mint' },
      { value: '#ff9a56', label: 'Orange' },
      { value: '#ff6b6b', label: 'Red' },
      { value: '#556270', label: 'Gray' },
      { value: '#2d3436', label: 'Dark' },
      { value: '#dfe6e9', label: 'Light Gray' },
      { value: '#00b894', label: 'Teal' },
      { value: '#6c5ce7', label: 'Violet' }
    ];

    // Ambil pesan sukses/error dari query params
    const success = req.query.success || null;
    const error = req.query.error || null;

    // Set cache control headers untuk prevent browser caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.render('pages/profile', {
      title: 'Profile - Lokerin',
      user,
      profile,
      success,
      error,
      bannerColors,
      // Structured profile data
      skills,
      experiences,
      educations,
      portfolios,
      privacySettings,
      completeness,
      // Statistics
      stats
    });
  } catch (error) {
    console.error('Show profile error:', error);
    res.redirect('/');
  }
};

/**
 * Menampilkan profil publik user lain
 * Hanya menampilkan data yang boleh dilihat publik
 */
const showUserProfile = async (req, res) => {
  try {
    const viewUserId = parseInt(req.params.id, 10);

    // Ambil data user yang dilihat
    const user = await User.findById(viewUserId);

    if (!user) {
      return res.status(404).render('pages/404', {
        title: 'User Tidak Ditemukan',
        user: req.user || null
      });
    }

    // Ambil data publik user (skills, experiences, educations, portfolios)
    const [skills, experiences, educations, portfolios] = await Promise.all([
      Profile.getSkills(viewUserId),
      Profile.getExperiences(viewUserId),
      Profile.getEducations(viewUserId),
      Profile.getPortfolios(viewUserId)
    ]);

    // Cek apakah yang melihat adalah pemilik profil
    const isOwner = req.user && Number(req.user.id) === Number(viewUserId);

    // Jika pemilik, redirect ke halaman profil sendiri
    if (isOwner) {
      return res.redirect('/profile');
    }

    if (req.user && req.user.role === 'hr' && user.role === 'job_seeker') {
      await Application.markProfileViewedByHR(viewUserId, req.user.id);
    }

    // Pastikan salary fields ada di user object (untuk job seeker)
    const profileUser = {
      ...user,
      expected_salary_min: user.expected_salary_min || 0,
      expected_salary_max: user.expected_salary_max || 0
    };

    // Render halaman profil publik
    // Kirim currentUser agar navbar menampilkan user yang login dengan benar
    res.render('pages/user-profile', {
      title: `${user.name} - Lokerin`,
      profileUser: profileUser,
      skills,
      experiences,
      educations,
      portfolios,
      isOwner: false,
      currentUserRole: req.user ? req.user.role : null,
      currentUser: req.user || null // Untuk navbar
    });
  } catch (error) {
    console.error('Show user profile error:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: 'Terjadi kesalahan saat memuat profil'
    });
  }
};

/**
 * Tambah skill baru
 */
const addSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama keahlian wajib diisi' });
    }

    await Profile.addSkill(userId, name.trim());
    res.json({ success: true, message: 'Keahlian berhasil ditambahkan' });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({ error: 'Gagal menambah keahlian' });
  }
};

/**
 * Hapus skill
 */
const removeSkill = async (req, res) => {
  try {
    const skillId = req.params.id;
    const userId = req.user.id;
    const deleted = await Profile.deleteSkill(skillId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Keahlian tidak ditemukan' });
    }
    res.json({ success: true, message: 'Keahlian berhasil dihapus' });
  } catch (error) {
    console.error('Remove skill error:', error);
    res.status(500).json({ error: 'Gagal menghapus keahlian' });
  }
};

/**
 * Update profil user (lengkap)
 */
const updateProfileDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      bio, 
      about_me,
      phone, 
      address, 
      expected_salary_min, 
      expected_salary_max, 
      open_to_work, 
      work_preferences,
      instagram_url,
      github_url,
      twitter_url
    } = req.body;

    // Build update object based on what's provided
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (about_me !== undefined) updateData.about_me = about_me;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (instagram_url !== undefined) updateData.instagram_url = instagram_url || null;
    if (github_url !== undefined) updateData.github_url = github_url || null;
    if (twitter_url !== undefined) updateData.twitter_url = twitter_url || null;
    if (expected_salary_min !== undefined) updateData.expected_salary_min = expected_salary_min;
    if (expected_salary_max !== undefined) updateData.expected_salary_max = expected_salary_max;
    if (open_to_work !== undefined) updateData.open_to_work = open_to_work ? 1 : 0;
    if (work_preferences !== undefined) {
      updateData.work_preferences = typeof work_preferences === 'string' 
        ? work_preferences 
        : JSON.stringify(work_preferences);
    }

    // Try updating user. Note: if these columns don't exist in DB, 
    // it will throw, but we catch it.
    await User.update(userId, updateData);

    res.json({ success: true, message: 'Profil detail berhasil disimpan' });
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.warn("⚠️ Column doesn't exist in users table. Skipping these fields.", error.message);
      // Fallback: If migration script failed/hung and columns don't exist, just update what we can (bio).
      if (req.body.bio !== undefined) {
        await User.update(req.user.id, { bio: req.body.bio }).catch(e => console.error(e));
      }
      return res.json({ success: true, message: 'Profil berhasil disimpan (sebagian data tidak disupport database dan diabaikan)' });
    }
    console.error('Update profile details error:', error);
    res.status(500).json({ error: 'Gagal mengupdate profil' });
  }
};

/**
 * Update profil user dasar (nama, bio - legacy)
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio } = req.body;

    // Validasi input
    if (!name) {
      return res.status(400).json({ error: 'Nama wajib diisi' });
    }

    // Update data user
    await User.update(userId, { name, bio });

    res.json({ success: true, message: 'Profil berhasil diupdate' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Gagal mengupdate profil' });
  }
};

/**
 * Upload foto profil
 */
const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Silakan pilih file gambar' });
    }

    // Hapus foto lama jika ada
    const user = await User.findById(userId);
    if (user.profile_image) {
      const oldFilePath = path.join(__dirname, '../public/images/profiles', user.profile_image);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Simpan nama file ke database
    const fileName = req.file.filename;
    await User.update(userId, { profile_image: fileName });

    // Refresh token in session to reflect the new profile_image site-wide
    const updatedUser = await User.findById(userId);
    const { generateToken } = require('../middleware/auth');
    req.session.token = generateToken(updatedUser);

    res.json({
      success: true,
      message: 'Foto profil berhasil diupload',
      profile_image: fileName
    });
  } catch (error) {
    logger.error('Upload profile image error', { error: error.message });
    res.status(500).json({ error: 'Gagal mengupload foto profil' });
  }
};

/**
 * Upload banner profil
 */
const uploadBannerImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Silakan pilih file gambar' });
    }

    const user = await User.findById(userId);
    if (user.banner_image) {
      const oldFilePath = path.join(__dirname, '../public/images/banners', user.banner_image);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    if (user.banner_color) {
      await User.update(userId, { banner_color: null });
    }

    const fileName = req.file.filename;
    await User.update(userId, { banner_image: fileName });

    res.json({
      success: true,
      message: 'Banner berhasil diupload',
      banner_image: fileName
    });
  } catch (error) {
    logger.error('Upload banner error', { error: error.message });
    res.status(500).json({ error: 'Gagal mengupload banner' });
  }
};

/**
 * Hapus foto profil
 */
const removeProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Hapus file fisik jika ada
    if (user.profile_image) {
      const filePath = path.join(__dirname, '../public/images/profiles', user.profile_image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted profile image: ${filePath}`);
      }
    }

    // Hapus dari database
    await User.update(userId, { profile_image: null });

    // Refresh token in session to remove profile_image site-wide
    const updatedUser = await User.findById(userId);
    const { generateToken } = require('../middleware/auth');
    req.session.token = generateToken(updatedUser);

    // Redirect dengan pesan sukses
    res.redirect('/profile?success=Foto+profil+berhasil+dihapus');
  } catch (error) {
    console.error('Remove profile image error:', error);
    res.redirect('/profile?error=Gagal+menghapus+foto+profil');
  }
};

/**
 * Hapus banner
 */
const removeBannerImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Hapus file fisik jika ada
    if (user.banner_image) {
      const filePath = path.join(__dirname, '../public/images/banners', user.banner_image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Hapus banner_image dan banner_color dari database
    await User.update(userId, { banner_image: null, banner_color: null });

    res.redirect('/profile?success=Banner+berhasil+dihapus');
  } catch (error) {
    logger.error('Remove banner error', { error: error.message });
    res.redirect('/profile?error=Gagal+menghapus+banner');
  }
};

/**
 * Set banner color
 */
const setBannerColor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { color } = req.body;

    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!color || !colorRegex.test(color)) {
      return res.status(400).json({ error: 'Warna tidak valid' });
    }

    const user = await User.findById(userId);
    const updateData = { banner_color: color };

    if (user.banner_image) {
      const filePath = path.join(__dirname, '../public/images/banners', user.banner_image);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (deleteError) { /* ignore */ }
      }
      updateData.banner_image = null;
    }

    await User.update(userId, updateData);

    res.json({
      success: true,
      message: 'Warna banner berhasil diubah',
      banner_color: color
    });
  } catch (error) {
    logger.error('Set banner color error', { error: error.message });
    res.status(500).json({ error: 'Gagal mengubah warna banner' });
  }
};

// ========== EXPERIENCE CRUD ==========
const addExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    let { position, company, start_date, end_date, is_current, description } = req.body;
    if (!position || !company) return res.status(400).json({ error: 'Posisi dan perusahaan wajib diisi' });

    if (start_date && start_date.includes('-') && start_date.split('-').length === 2) {
      start_date = start_date + '-01';
    }
    if (end_date && end_date.includes('-') && end_date.split('-').length === 2) {
      end_date = end_date + '-01';
    }

    const id = await Profile.addExperience(userId, { position, company, start_date, end_date, is_current: is_current ? 1 : 0, description });
    res.json({ success: true, id, message: 'Pengalaman berhasil ditambahkan' });
  } catch (error) {
    logger.error('Add experience error', { error: error.message });
    res.status(500).json({ error: 'Gagal menambah pengalaman' });
  }
};

const deleteExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Profile.deleteExperience(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Pengalaman tidak ditemukan' });
    }
    res.json({ success: true, message: 'Pengalaman berhasil dihapus' });
  } catch (error) {
    console.error('Delete experience error:', error);
    res.status(500).json({ error: 'Gagal menghapus pengalaman' });
  }
};

const addEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { school, degree, field_of_study, start_year, end_year, gpa } = req.body;
    if (!school) return res.status(400).json({ error: 'Nama institusi wajib diisi' });

    const id = await Profile.addEducation(userId, { school, degree, field_of_study, start_year, end_year, gpa });
    res.json({ success: true, id, message: 'Pendidikan berhasil ditambahkan' });
  } catch (error) {
    console.error('Add education error:', error);
    res.status(500).json({ error: 'Gagal menambah pendidikan' });
  }
};

const deleteEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Profile.deleteEducation(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Pendidikan tidak ditemukan' });
    }
    res.json({ success: true, message: 'Pendidikan berhasil dihapus' });
  } catch (error) {
    console.error('Delete education error:', error);
    res.status(500).json({ error: 'Gagal menghapus pendidikan' });
  }
};

module.exports = {
  showProfile,
  showUserProfile,
  updateProfile,
  updateProfileDetails,
  addSkill,
  removeSkill,
  addExperience,
  deleteExperience,
  addEducation,
  deleteEducation,
  uploadProfileImage,
  uploadBannerImage,
  removeProfileImage,
  removeBannerImage,
  setBannerColor
};

/**
 * Profile Controller
 * Menangani tampilan dan update profil user
 */
const User = require('../models/User');
const Profile = require('../models/Profile');
const path = require('path');
const fs = require('fs');

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

    // Ambil semua structured profile data
    const [skills, experiences, educations, portfolios, privacySettings] = await Promise.all([
      Profile.getSkills(userId),
      Profile.getExperiences(userId),
      Profile.getEducations(userId),
      Profile.getPortfolios(userId),
      Profile.getPrivacySettings(userId)
    ]);

    // Hitung kelengkapan profil
    const completeness = await Profile.calculateCompleteness(userId);

    // Ambil profile data untuk lokasi
    const profile = {
      location: '-',
      linkedin: null,
      github: null
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
      completeness
    });
  } catch (error) {
    console.error('Show profile error:', error);
    res.redirect('/');
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
    const userId = req.user.id;
    const skillId = req.params.id;

    await Profile.removeSkill(skillId, userId);
    res.json({ success: true, message: 'Keahlian berhasil dihapus' });
  } catch (error) {
    console.error('Remove skill error:', error);
    res.status(500).json({ error: 'Gagal menghapus keahlian' });
  }
};

/**
 * Update profil user (nama, bio)
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
        console.log(`🗑️ Deleted old profile image: ${oldFilePath}`);
      }
    }

    // Simpan nama file ke database
    const fileName = req.file.filename;
    await User.update(userId, { profile_image: fileName });

    // Return JSON response for AJAX
    res.json({ 
      success: true, 
      message: 'Foto profil berhasil diupload',
      profile_image: fileName 
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
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

    // Hapus banner lama jika ada
    const user = await User.findById(userId);
    if (user.banner_image) {
      const oldFilePath = path.join(__dirname, '../public/images/banners', user.banner_image);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`🗑️ Deleted old banner: ${oldFilePath}`);
      }
    }

    // Jika ada banner color, hapus juga
    if (user.banner_color) {
      await User.update(userId, { banner_color: null });
    }

    // Simpan nama file ke database
    const fileName = req.file.filename;
    await User.update(userId, { banner_image: fileName });

    // Return JSON response for AJAX
    res.json({ 
      success: true, 
      message: 'Banner berhasil diupload',
      banner_image: fileName 
    });
  } catch (error) {
    console.error('Upload banner error:', error);
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
        console.log(`✅ Deleted banner image: ${filePath}`);
      }
    }

    // Hapus dari database
    await User.update(userId, { banner_image: null });

    // Redirect dengan pesan sukses
    res.redirect('/profile?success=Banner+berhasil+dihapus');
  } catch (error) {
    console.error('Remove banner error:', error);
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

    console.log(`🎨 Setting banner color for user ${userId}: ${color}`);

    // Validasi color hex format (6 digits dengan #)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!color || !colorRegex.test(color)) {
      console.error(`❌ Invalid color format: ${color}`);
      return res.status(400).json({ error: 'Warna tidak valid' });
    }

    // Get current user data
    const user = await User.findById(userId);
    console.log(`📋 Current user banner_image: ${user.banner_image}, banner_color: ${user.banner_color}`);
    
    const updateData = { banner_color: color };

    // Jika ada banner image, hapus file dan set null
    if (user.banner_image) {
      const filePath = path.join(__dirname, '../public/images/banners', user.banner_image);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted banner image file: ${filePath}`);
        } catch (deleteError) {
          console.error(`⚠️ Failed to delete file: ${deleteError.message}`);
        }
      }
      // Set banner_image to null
      updateData.banner_image = null;
    }

    console.log(`💾 Updating user with data:`, updateData);
    await User.update(userId, updateData);

    // Get updated user data
    const updatedUser = await User.findById(userId);
    console.log(`✅ Updated user banner_color: ${updatedUser.banner_color}, banner_image: ${updatedUser.banner_image}`);

    // Return JSON response for AJAX request
    res.json({ 
      success: true, 
      message: 'Warna banner berhasil diubah',
      banner_color: updatedUser.banner_color 
    });
  } catch (error) {
    console.error('❌ Set banner color error:', error);
    res.status(500).json({ error: 'Gagal mengubah warna banner' });
  }
};

module.exports = {
  showProfile,
  updateProfile,
  addSkill,
  removeSkill,
  uploadProfileImage,
  uploadBannerImage,
  removeProfileImage,
  removeBannerImage,
  setBannerColor
};

/**
 * Profile Controller
 * Menangani structured profile management
 */
const Profile = require('../models/Profile');
const User = require('../models/User');

/**
 * Get complete user profile with all sections
 */
const getCompleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user basic info
    const user = await User.findById(userId);

    // Get all sections
    const [skills, experiences, educations, portfolios, privacySettings] = await Promise.all([
      Profile.getSkills(userId),
      Profile.getExperiences(userId),
      Profile.getEducations(userId),
      Profile.getPortfolios(userId),
      Profile.getPrivacySettings(userId)
    ]);

    // Calculate completeness
    const completeness = await Profile.calculateCompleteness(userId);

    res.render('pages/profile', {
      title: 'Profile - Lokerin',
      user,
      skills,
      experiences,
      educations,
      portfolios,
      privacySettings,
      completeness,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.redirect('/profile?error=Gagal+memuat+profil');
  }
};

// ==================== SKILLS CRUD ====================

const addSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, level } = req.body;

    if (!name) {
      return res.redirect('/profile?error=Nama+skill+wajib+diisi');
    }

    await Profile.addSkill(userId, name, level || 'Intermediate');
    res.redirect('/profile?success=Skill+berhasil+ditambahkan');
  } catch (error) {
    console.error('Add skill error:', error);
    res.redirect('/profile?error=Gagal+menambahkan+skill');
  }
};

const updateSkill = async (req, res) => {
  try {
    const skillId = req.params.id;
    const userId = req.user.id;
    const { name, level } = req.body;
    const updated = await Profile.updateSkill(skillId, userId, name, level);
    if (!updated) {
      return res.status(404).json({ error: 'Skill tidak ditemukan' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({ error: 'Gagal mengupdate skill' });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const skillId = req.params.id;
    const userId = req.user.id;
    const deleted = await Profile.deleteSkill(skillId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Skill tidak ditemukan' });
    }
    res.redirect('/profile?success=Skill+berhasil+dihapus');
  } catch (error) {
    console.error('Delete skill error:', error);
    res.redirect('/profile?error=Gagal+menghapus+skill');
  }
};

// ==================== EXPERIENCES CRUD ====================

const addExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { position, company, start_date, end_date, is_current, description } = req.body;

    if (!position || !company || !start_date) {
      return res.redirect('/profile?error=Posisi,+perusahaan,+dan+tanggal+mulai+wajib+diisi');
    }

    await Profile.addExperience(userId, {
      position,
      company,
      start_date,
      end_date: is_current === 'on' ? null : end_date,
      is_current: is_current === 'on',
      description
    });

    res.redirect('/profile?success=Pengalaman+kerja+berhasil+ditambahkan');
  } catch (error) {
    console.error('Add experience error:', error);
    res.redirect('/profile?error=Gagal+menambahkan+pengalaman');
  }
};

const updateExperience = async (req, res) => {
  try {
    const expId = req.params.id;
    const userId = req.user.id;
    const { position, company, start_date, end_date, is_current, description } = req.body;

    const updated = await Profile.updateExperience(expId, userId, {
      position,
      company,
      start_date,
      end_date: is_current === 'on' ? null : end_date,
      is_current: is_current === 'on',
      description
    });
    if (!updated) {
      return res.status(404).json({ error: 'Pengalaman tidak ditemukan' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({ error: 'Gagal mengupdate pengalaman' });
  }
};

const deleteExperience = async (req, res) => {
  try {
    const expId = req.params.id;
    const userId = req.user.id;
    const deleted = await Profile.deleteExperience(expId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Pengalaman tidak ditemukan' });
    }
    res.redirect('/profile?success=Pengalaman+kerja+berhasil+dihapus');
  } catch (error) {
    console.error('Delete experience error:', error);
    res.redirect('/profile?error=Gagal+menghapus+pengalaman');
  }
};

// ==================== EDUCATIONS CRUD ====================

const addEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { school, degree, field_of_study, start_year, end_year } = req.body;

    if (!school || !start_year) {
      return res.redirect('/profile?error=Sekolah+dan+tahun+mulai+wajib+diisi');
    }

    await Profile.addEducation(userId, {
      school,
      degree,
      field_of_study,
      start_year,
      end_year
    });

    res.redirect('/profile?success=Pendidikan+berhasil+ditambahkan');
  } catch (error) {
    console.error('Add education error:', error);
    res.redirect('/profile?error=Gagal+menambahkan+pendidikan');
  }
};

const updateEducation = async (req, res) => {
  try {
    const eduId = req.params.id;
    const userId = req.user.id;
    const { school, degree, field_of_study, start_year, end_year } = req.body;

    const updated = await Profile.updateEducation(eduId, userId, {
      school,
      degree,
      field_of_study,
      start_year,
      end_year
    });
    if (!updated) {
      return res.status(404).json({ error: 'Pendidikan tidak ditemukan' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({ error: 'Gagal mengupdate pendidikan' });
  }
};

const deleteEducation = async (req, res) => {
  try {
    const eduId = req.params.id;
    const userId = req.user.id;
    const deleted = await Profile.deleteEducation(eduId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Pendidikan tidak ditemukan' });
    }
    res.redirect('/profile?success=Pendidikan+berhasil+dihapus');
  } catch (error) {
    console.error('Delete education error:', error);
    res.redirect('/profile?error=Gagal+menghapus+pendidikan');
  }
};

// ==================== PORTFOLIOS CRUD ====================

const fs = require('fs');
const path = require('path');

const addPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, url, github_url } = req.body;
    const image_url = req.file ? req.file.filename : null;

    if (!title) {
      return res.status(400).json({ error: 'Judul portofolio wajib diisi' });
    }

    const id = await Profile.addPortfolio(userId, {
      title,
      description,
      url,
      github_url,
      image_url
    });

    res.json({ success: true, id, message: 'Portofolio berhasil ditambahkan' });
  } catch (error) {
    console.error('Add portfolio error:', error);
    res.status(500).json({ error: 'Gagal menambahkan portofolio' });
  }
};

const updatePortfolio = async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user.id;
    const { title, description, url, github_url } = req.body;

    const existing = await Profile.getPortfolioById(portfolioId, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Portofolio tidak ditemukan' });
    }

    let image_url = existing.image_url;
    if (req.file) {
      image_url = req.file.filename;
      // Delete old image file if exists
      if (existing.image_url) {
        const oldPath = path.join(__dirname, '../public/images/portfolios', existing.image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    await Profile.updatePortfolio(portfolioId, userId, {
      title,
      description,
      url,
      github_url,
      image_url
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ error: 'Gagal mengupdate portofolio' });
  }
};

const deletePortfolio = async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user.id;

    const portfolio = await Profile.getPortfolioById(portfolioId, userId);

    if (!portfolio) {
      return res.status(404).json({ error: 'Portofolio tidak ditemukan' });
    }

    if (portfolio.image_url) {
      const filePath = path.join(__dirname, '../public/images/portfolios', portfolio.image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Profile.deletePortfolio(portfolioId, userId);
    res.json({ success: true, message: 'Portofolio berhasil dihapus' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Gagal menghapus portofolio' });
  }
};

// ==================== PRIVACY SETTINGS ====================

const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hide_email_from_hr, hide_phone_from_hr, require_approval_for_contact } = req.body;

    await Profile.updatePrivacySettings(userId, {
      hide_email_from_hr: hide_email_from_hr === 'on',
      hide_phone_from_hr: hide_phone_from_hr === 'on',
      require_approval_for_contact: require_approval_for_contact === 'on'
    });

    res.redirect('/profile?success=Pengaturan+privasi+berhasil+diupdate');
  } catch (error) {
    console.error('Update privacy error:', error);
    res.redirect('/profile?error=Gagal+mengupdate+pengaturan+privasi');
  }
};

module.exports = {
  getCompleteProfile,
  addSkill,
  updateSkill,
  deleteSkill,
  addExperience,
  updateExperience,
  deleteExperience,
  addEducation,
  updateEducation,
  deleteEducation,
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  updatePrivacySettings
};

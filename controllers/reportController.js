const Report = require('../models/Report');
const Job = require('../models/Job');
const User = require('../models/User');
const { validateReturnUrl } = require('../utils/helpers');

function sanitizeReturnUrl(value, fallback) {
  return validateReturnUrl(value) || fallback;
}

function getRequiredText(value) {
  return String(value || '').trim();
}

const reportController = {
  reportJob: async (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    const returnUrl = sanitizeReturnUrl(req.body.returnUrl || req.get('referer'), `/jobs/${jobId}`);

    try {
      const reason = getRequiredText(req.body.reason);
      const details = getRequiredText(req.body.details);

      if (!reason) {
        return res.redirect(`${returnUrl}?error=${encodeURIComponent('Alasan laporan wajib dipilih')}`);
      }

      const job = await Job.findById(jobId);
      if (!job) {
        return res.redirect(`${returnUrl}?error=${encodeURIComponent('Lowongan tidak ditemukan')}`);
      }

      await Report.create({
        reporterId: req.user.id,
        targetType: 'job',
        targetId: jobId,
        reason,
        details
      });

      return res.redirect(`${returnUrl}?success=${encodeURIComponent('Laporan lowongan berhasil dikirim ke admin')}`);
    } catch (error) {
      console.error('Report job error:', error);
      return res.redirect(`${returnUrl}?error=${encodeURIComponent('Gagal mengirim laporan lowongan')}`);
    }
  },

  reportUser: async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const returnUrl = sanitizeReturnUrl(req.body.returnUrl || req.get('referer'), `/user/${userId}`);

    try {
      const reason = getRequiredText(req.body.reason);
      const details = getRequiredText(req.body.details);

      if (!reason) {
        return res.redirect(`${returnUrl}?error=${encodeURIComponent('Alasan laporan wajib dipilih')}`);
      }

      if (Number(req.user.id) === Number(userId)) {
        return res.redirect(`${returnUrl}?error=${encodeURIComponent('Anda tidak dapat melaporkan akun sendiri')}`);
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.redirect(`${returnUrl}?error=${encodeURIComponent('User tidak ditemukan')}`);
      }

      await Report.create({
        reporterId: req.user.id,
        targetType: 'user',
        targetId: userId,
        reason,
        details
      });

      return res.redirect(`${returnUrl}?success=${encodeURIComponent('Laporan user berhasil dikirim ke admin')}`);
    } catch (error) {
      console.error('Report user error:', error);
      return res.redirect(`${returnUrl}?error=${encodeURIComponent('Gagal mengirim laporan user')}`);
    }
  }
};

module.exports = reportController;

const Application = require('../models/Application');
const {
  sendInterviewInvitationEmail,
  sendApplicationRejectionEmail
} = require('../services/emailService');

const DEFAULT_REJECTION_REASON = 'Terima kasih atas ketertarikan Anda. Saat ini kami memutuskan untuk tidak melanjutkan proses lamaran Anda karena kualifikasi yang belum sesuai dengan kebutuhan posisi ini.';

function isMissing(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function isJsonRequest(req) {
  return req.xhr || req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
}

function redirectOrJson(req, res, statusCode, payload) {
  if (isJsonRequest(req)) {
    return res.status(statusCode).json(payload);
  }

  const returnUrl = req.body.returnUrl || '/hr/jobs';
  const key = payload.success ? 'success' : 'error';
  const message = encodeURIComponent(payload.message || (payload.success ? 'Berhasil' : 'Terjadi kesalahan'));
  return res.redirect(`${returnUrl}?${key}=${message}`);
}

const applicationController = {
  inviteToInterview: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'hr') {
        return redirectOrJson(req, res, 403, {
          success: false,
          message: 'Hanya HR yang dapat mengirim undangan wawancara'
        });
      }

      const { interviewDate, interviewTime, interviewMethod, interviewLocation } = req.body;

      if (isMissing(interviewDate) || isMissing(interviewTime) || isMissing(interviewMethod) || isMissing(interviewLocation)) {
        return redirectOrJson(req, res, 400, {
          success: false,
          message: 'Tanggal, waktu, metode, dan lokasi/link wawancara wajib diisi'
        });
      }

      const application = await Application.findById(req.params.id);
      if (!application) {
        return redirectOrJson(req, res, 404, {
          success: false,
          message: 'Lamaran tidak ditemukan'
        });
      }

      if (Number(application.hr_id) !== Number(req.user.id)) {
        return redirectOrJson(req, res, 403, {
          success: false,
          message: 'Anda tidak memiliki akses ke lamaran ini'
        });
      }

      const updated = await Application.scheduleInterview(req.params.id, req.user.id, {
        interviewDate,
        interviewTime,
        interviewMethod,
        interviewLocation
      });

      if (!updated) {
        return redirectOrJson(req, res, 400, {
          success: false,
          message: 'Gagal menyimpan jadwal wawancara'
        });
      }

      try {
        await sendInterviewInvitationEmail({
          to: application.applicant_email,
          jobSeekerName: application.applicant_name,
          companyName: application.company,
          jobPosition: application.job_title,
          interviewDate,
          interviewTime,
          interviewMethod,
          interviewLocation
        });
      } catch (emailError) {
        console.error('Send interview invitation email error:', emailError);
        return redirectOrJson(req, res, 200, {
          success: true,
          emailSent: false,
          message: 'Jadwal wawancara tersimpan, tetapi email gagal dikirim',
          error: emailError.message
        });
      }

      return redirectOrJson(req, res, 200, {
        success: true,
        emailSent: true,
        message: 'Undangan wawancara berhasil dikirim'
      });
    } catch (error) {
      console.error('Invite interview error:', error);
      return redirectOrJson(req, res, 500, {
        success: false,
        message: 'Terjadi kesalahan saat mengirim undangan wawancara',
        error: error.message
      });
    }
  },

  rejectApplication: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'hr') {
        return redirectOrJson(req, res, 403, {
          success: false,
          message: 'Hanya HR yang dapat menolak lamaran'
        });
      }

      const reason = isMissing(req.body.reason)
        ? DEFAULT_REJECTION_REASON
        : String(req.body.reason).trim();

      const application = await Application.findById(req.params.id);
      if (!application) {
        return redirectOrJson(req, res, 404, {
          success: false,
          message: 'Lamaran tidak ditemukan'
        });
      }

      if (Number(application.hr_id) !== Number(req.user.id)) {
        return redirectOrJson(req, res, 403, {
          success: false,
          message: 'Anda tidak memiliki akses ke lamaran ini'
        });
      }

      const updated = await Application.rejectByHR(req.params.id, req.user.id, reason);
      if (!updated) {
        return redirectOrJson(req, res, 400, {
          success: false,
          message: 'Lamaran tidak dapat ditolak atau statusnya sudah final'
        });
      }

      try {
        await sendApplicationRejectionEmail({
          to: application.applicant_email,
          jobSeekerName: application.applicant_name,
          companyName: application.company,
          jobPosition: application.job_title,
          reason
        });
      } catch (emailError) {
        console.error('Send rejection email error:', emailError);
        return redirectOrJson(req, res, 200, {
          success: true,
          emailSent: false,
          message: 'Lamaran berhasil ditolak, tetapi email gagal dikirim',
          error: emailError.message
        });
      }

      return redirectOrJson(req, res, 200, {
        success: true,
        emailSent: true,
        message: 'Lamaran berhasil ditolak dan email sudah dikirim'
      });
    } catch (error) {
      console.error('Reject application error:', error);
      return redirectOrJson(req, res, 500, {
        success: false,
        message: 'Terjadi kesalahan saat menolak lamaran',
        error: error.message
      });
    }
  }
};

module.exports = applicationController;

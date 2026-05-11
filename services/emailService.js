const nodemailer = require('nodemailer');
const path = require('path');

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER dan EMAIL_PASS wajib diisi di file .env');
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

function getBaseUrl() {
  return process.env.APP_URL || process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateId(value, includeWeekday = false) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('id-ID', {
    weekday: includeWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatTimeId(value) {
  if (!value) return '-';
  return String(value).slice(0, 5);
}

function renderInterviewInvitationTemplate({
  jobSeekerName,
  companyName,
  jobPosition,
  interviewDate,
  interviewTime,
  interviewMethod,
  interviewLocation,
  currentDate
}) {
  const safeLocation = escapeHtml(interviewLocation);

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.8; color: #333; max-width: 650px; margin: auto; border: 1px solid #e0e0e0; padding: 30px; background-color: #ffffff; border-radius: 10px;">
      <div style="text-align: center; border-bottom: 3px solid #28a745; padding-bottom: 15px; margin-bottom: 25px;">
        <h2 style="color: #28a745; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Undangan Wawancara Kerja</h2>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">Lokerin Platform - ${escapeHtml(companyName)}</p>
      </div>

      <div style="font-size: 15px;">
        <p>Jakarta, ${escapeHtml(currentDate)}</p>

        <p>Yth. <strong>${escapeHtml(jobSeekerName)}</strong>,</p>

        <p>Terima kasih atas minat Anda untuk bergabung bersama <strong>${escapeHtml(companyName)}</strong>. Setelah meninjau curriculum vitae (CV) dan portofolio yang Anda kirimkan, kami dengan senang hati mengundang Anda untuk mengikuti tahap wawancara untuk posisi:</p>

        <p style="text-align: center; font-size: 18px; color: #28a745; font-weight: bold;">${escapeHtml(jobPosition)}</p>

        <p>Sesi wawancara ini akan dilaksanakan pada:</p>

        <div style="background-color: #f8fff9; border: 1px dashed #28a745; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 35%; padding: 8px 0;"><strong>Hari / Tanggal</strong></td>
              <td>: ${escapeHtml(formatDateId(interviewDate, true))}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Waktu</strong></td>
              <td>: ${escapeHtml(formatTimeId(interviewTime))} WIB</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Metode</strong></td>
              <td>: ${escapeHtml(interviewMethod)} (Online / Tatap Muka)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Lokasi / Link</strong></td>
              <td>: <a href="${safeLocation}" style="color: #007bff; text-decoration: none;">${safeLocation}</a></td>
            </tr>
          </table>
        </div>

        <p><strong>Instruksi Tambahan:</strong></p>
        <ul style="padding-left: 20px;">
          <li>Mohon hadir/bergabung 10 menit sebelum jadwal dimulai.</li>
          <li>Siapkan perangkat pendukung (jika online) atau dokumen fisik (jika tatap muka).</li>
          <li>Konfirmasikan kehadiran Anda melalui dashboard <strong>Lokerin</strong> sesegera mungkin.</li>
        </ul>

        <p>Jika Anda memiliki kendala terkait jadwal di atas, silakan hubungi kami dengan membalas email ini.</p>
      </div>

      <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 13px; color: #888; text-align: center;">
        <p style="margin: 0;">Salam hangat,</p>
        <p style="margin: 5px 0; color: #333; font-weight: bold;">Tim HRD ${escapeHtml(companyName)}</p>
        <p style="margin-top: 15px; font-size: 11px;">Email ini dikirimkan secara otomatis. Mohon tidak membalas langsung kecuali diperlukan bantuan teknis.</p>
      </div>
    </div>
  `;
}

function renderRejectionEmailTemplate({
  jobSeekerName,
  companyName,
  jobPosition,
  reason
}) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #444; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; text-transform: uppercase;">Update Status Lamaran</h2>
        <p style="margin: 5px 0; opacity: 0.9;">Lokerin Platform - ${escapeHtml(companyName)}</p>
      </div>
      <div style="padding: 30px;">
        <p>Halo <strong>${escapeHtml(jobSeekerName)}</strong>,</p>
        <p>Terima kasih telah melamar posisi <strong>${escapeHtml(jobPosition)}</strong>. Kami sangat menghargai waktu yang Anda luangkan untuk mengikuti proses seleksi di perusahaan kami.</p>

        <p>Setelah melakukan peninjauan yang cermat, kami menyesal harus menginformasikan bahwa kami belum dapat melanjutkan lamaran Anda ke tahap berikutnya saat ini.</p>

        <div style="background-color: #fff5f5; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; font-style: italic; color: #666;">
          <strong>Catatan Rekruiter:</strong><br>
          "${escapeHtml(reason)}"
        </div>

        <p>Keputusan ini tidak merefleksikan potensi Anda secara keseluruhan. Kami akan tetap menyimpan data Anda dalam basis data kami untuk peluang di masa depan yang mungkin lebih sesuai dengan profil Anda.</p>

        <p>Tetap semangat dan semoga sukses dengan pencarian kerja Anda!</p>
      </div>
      <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
        &copy; 2026 Lokerin Platform. Sistem Rekrutmen Otomatis.
      </div>
    </div>
  `;
}

async function sendInterviewInvitation({ to, jobSeekerName, companyName, jobPosition, schedule, meetingLink }) {
  const transporter = createTransporter();
  const scheduleText = schedule
    ? new Date(schedule).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
    : 'Akan dikonfirmasi oleh HR';

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Undangan Interview - ${jobPosition}`,
    html: `
      <p>Halo ${jobSeekerName},</p>
      <p>Anda diundang untuk mengikuti interview untuk posisi <strong>${jobPosition}</strong> di <strong>${companyName}</strong>.</p>
      <p><strong>Jadwal:</strong> ${scheduleText}</p>
      <p><strong>Link:</strong> ${meetingLink ? `<a href="${meetingLink}">${meetingLink}</a>` : '-'}</p>
      <p>Silakan cek dashboard Lokerin Anda untuk detail lebih lanjut.</p>
    `
  });
}

async function sendInterviewInvitationEmail({
  to,
  jobSeekerName,
  companyName,
  jobPosition,
  interviewDate,
  interviewTime,
  interviewMethod,
  interviewLocation
}) {
  const transporter = createTransporter();
  const currentDate = formatDateId(new Date().toISOString().slice(0, 10));

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Undangan Wawancara - ${jobPosition}`,
    html: renderInterviewInvitationTemplate({
      jobSeekerName,
      companyName,
      jobPosition,
      interviewDate,
      interviewTime,
      interviewMethod,
      interviewLocation,
      currentDate
    })
  });
}

async function sendOfferingLetterEmail({ to, jobSeekerName, companyName, jobPosition, pdfPath, applicationId }) {
  const transporter = createTransporter();
  const responseUrl = `${getBaseUrl()}/applications`;

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Offering Letter - ${jobPosition}`,
    html: `
      <p>Halo ${jobSeekerName},</p>
      <p>Selamat! Anda menerima offering letter untuk posisi <strong>${jobPosition}</strong> di <strong>${companyName}</strong>.</p>
      <p>Dokumen offering letter terlampir pada email ini.</p>
      <p>Silakan masuk ke Lokerin untuk memilih <strong>Terima</strong> atau <strong>Tolak</strong> penawaran pada halaman Lamaran Saya:</p>
      <p><a href="${responseUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Buka Dashboard Lokerin</a></p>
    `,
    attachments: [
      {
        filename: path.basename(pdfPath),
        path: pdfPath
      }
    ]
  });
}

async function sendApplicationRejectionEmail({
  to,
  jobSeekerName,
  companyName,
  jobPosition,
  reason
}) {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Update Status Lamaran - ${jobPosition}`,
    html: renderRejectionEmailTemplate({
      jobSeekerName,
      companyName,
      jobPosition,
      reason
    })
  });
}

module.exports = {
  sendInterviewInvitation,
  sendInterviewInvitationEmail,
  renderInterviewInvitationTemplate,
  renderRejectionEmailTemplate,
  sendApplicationRejectionEmail,
  sendOfferingLetterEmail
};

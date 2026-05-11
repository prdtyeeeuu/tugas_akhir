const path = require('path');
const fs = require('fs');
const htmlPdf = require('html-pdf-node');

const DOCUMENT_DIR = path.join(__dirname, '..', 'public', 'uploads', 'documents');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString('id-ID');
}

function renderOfferingLetterTemplate(data) {
  const template = `<!DOCTYPE html>
<html>
<body>
  <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #333; max-width: 700px; margin: auto; border: 1px solid #ddd; padding: 25px 40px; background-color: #ffffff; box-sizing: border-box;">
    <div style="text-align: center; border-bottom: 2px solid #0056b3; padding-bottom: 10px; margin-bottom: 15px;">
      <h2 style="color: #0056b3; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; font-size: 18px;">Surat Penawaran Kerja Resmi</h2>
      <p style="margin: 3px 0; color: #777; font-size: 12px;">Nomor: OL/LOKERIN/{{year}}/{{applicationId}}</p>
    </div>

    <div style="font-size: 13.5px; text-align: justify;">
      <p style="margin: 5px 0;">Jakarta, {{currentDate}}</p>

      <p style="margin: 10px 0;">Kepada Yth,<br>
      <strong>{{jobSeekerName}}</strong><br>
      {{jobSeekerCity}}</p>

      <p style="margin: 10px 0;">Perihal: <strong>Penawaran Hubungan Kerja</strong></p>

      <p style="margin: 10px 0;">Halo {{jobSeekerName}},</p>

      <p style="margin: 10px 0;">Berdasarkan hasil rangkaian proses seleksi, kami dari <strong>{{companyName}}</strong> secara resmi mengundang Anda untuk bergabung bersama tim kami sebagai:</p>

      <div style="background-color: #f9f9f9; border-left: 5px solid #0056b3; padding: 10px 15px; margin: 15px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
          <tr>
            <td style="width: 35%; padding: 3px 0;"><strong>Posisi</strong></td>
            <td>: {{jobPosition}}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Gaji Pokok</strong></td>
            <td>: Rp {{salary}} / Bulan</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Tanggal Bergabung</strong></td>
            <td>: {{startDate}}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;"><strong>Lokasi Kerja</strong></td>
            <td>: {{jobLocation}}</td>
          </tr>
        </table>
      </div>

      <h4 style="color: #0056b3; border-bottom: 1px solid #eee; padding-bottom: 3px; margin: 10px 0;">Ketentuan Pekerjaan</h4>
      <p style="margin: 5px 0;">1. <strong>Masa Percobaan:</strong> 3 (tiga) bulan pertama.<br>
         2. <strong>Kerahasiaan:</strong> Menjaga kerahasiaan data perusahaan.<br>
         3. <strong>Jam Kerja:</strong> Sesuai peraturan internal perusahaan yang berlaku.</p>

      <p style="margin: 10px 0;">Mohon berikan konfirmasi persetujuan melalui dashboard pelamar Lokerin sebelum tanggal <strong>{{expiryDate}}</strong>. Jika tidak ada tanggapan, penawaran ini dianggap batal.</p>

      <p style="margin: 10px 0;">Selamat atas pencapaian ini. Kami menantikan kontribusi Anda.</p>
    </div>

    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; font-size: 11px; color: #999;">
      <p style="margin: 0;">Hormat Kami,</p>
      <p style="margin: 3px 0; color: #333; font-weight: bold;">Tim Rekrutmen {{companyName}}</p>
      <p style="margin-top: 10px; font-style: italic;">Dokumen digital ini sah tanpa tanda tangan fisik.</p>
    </div>
  </div>
</body>
</html>`;

  const replacements = {
    applicationId: escapeHtml(data.applicationId),
    year: escapeHtml(data.year || new Date(data.currentDate || Date.now()).getFullYear()),
    companyName: escapeHtml(data.companyName),
    currentDate: escapeHtml(formatDate(data.currentDate || new Date())),
    jobSeekerName: escapeHtml(data.jobSeekerName),
    jobSeekerCity: escapeHtml(data.jobSeekerCity || 'Di Tempat'),
    jobPosition: escapeHtml(data.jobPosition),
    salary: escapeHtml(formatCurrency(data.salary)),
    startDate: escapeHtml(formatDate(data.startDate)),
    expiryDate: escapeHtml(formatDate(data.expiryDate)),
    jobLocation: escapeHtml(data.jobLocation || data.workLocation || '-'),
    workLocation: escapeHtml(data.workLocation || '-')
  };

  return template.replace(/{{(\w+)}}/g, (_, key) => replacements[key] ?? '');
}

async function generateOfferingLetterPdf(data) {
  fs.mkdirSync(DOCUMENT_DIR, { recursive: true });

  const filename = `offering-${data.applicationId || Date.now()}-${Date.now()}.pdf`;
  const absolutePath = path.join(DOCUMENT_DIR, filename);
  const relativePath = `/uploads/documents/${filename}`;

  const html = renderOfferingLetterTemplate(data);
  const file = { content: html };
  const options = {
    format: 'A4',
    printBackground: true,
    path: absolutePath
  };

  await htmlPdf.generatePdf(file, options);

  return {
    filename,
    absolutePath,
    relativePath
  };
}

module.exports = {
  generateOfferingLetterPdf,
  renderOfferingLetterTemplate
};

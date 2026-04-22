/**
 * Shared Helper Functions
 * Extracted common utilities to avoid duplication
 */

/**
 * Format salary amount to readable string
 * @param {number} amount - Salary amount
 * @returns {string} - Formatted string
 */
function formatSalary(amount) {
  if (!amount) return '';
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1) + ' jt';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(0) + ' rb';
  }
  return amount.toString();
}

/**
 * Format date to relative time (e.g., "2 hari lalu")
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} - Relative time string
 */
function formatTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  const intervals = [
    { label: 'tahun', seconds: 31536000 },
    { label: 'bulan', seconds: 2592000 },
    { label: 'minggu', seconds: 604800 },
    { label: 'hari', seconds: 86400 },
    { label: 'jam', seconds: 3600 },
    { label: 'menit', seconds: 60 }
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      if (interval.label === 'jam') {
        return count + ' jam lalu';
      } else if (interval.label === 'menit') {
        return count < 60 ? 'Baru Saja' : count + ' menit lalu';
      } else if (interval.label === 'hari') {
        if (count === 1) return '1 hari lalu';
        if (count < 7) return count + ' hari lalu';
      }
      break;
    }
  }

  if (seconds < 60) return 'Baru Saja';
  return Math.floor(seconds / 3600) + ' jam lalu';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;'
  };
  return str.replace(/[&<>"'\/`]/g, char => htmlEntities[char]);
}

/**
 * Validate returnUrl to prevent open redirect
 * @param {string} url - URL to validate
 * @returns {string} - Safe URL or '/'
 */
function validateReturnUrl(url) {
  if (!url || typeof url !== 'string') return '/';
  // Only allow relative URLs starting with /
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('://')) {
    return url;
  }
  return '/';
}

module.exports = {
  formatSalary,
  formatTimeAgo,
  escapeHtml,
  validateReturnUrl
};

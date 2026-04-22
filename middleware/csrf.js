/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens for form submissions
 */
const crypto = require('crypto');

/**
 * Generate a random CSRF token
 * @returns {string} - CSRF token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF middleware - adds token to res.locals and validates on state-changing requests
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF check for API routes (they should use other auth mechanisms)
  if (req.path.startsWith('/api/') || req.path.startsWith('/chat/api/')) {
    res.locals.csrfToken = null;
    return next();
  }

  // Initialize session CSRF token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }

  // Add token to res.locals for use in templates
  res.locals.csrfToken = req.session.csrfToken;

  // Validate CSRF token on state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    // Check token from form body, query string, or header
    const token = (req.body && req.body._csrf) || (req.query && req.query._csrf) || req.headers['x-csrf-token'];

    if (!token || token !== req.session.csrfToken) {
      return res.status(403).render('pages/error', {
        title: '403 - Forbidden',
        error: 'Permintaan tidak valid. Silakan refresh halaman dan coba lagi.'
      });
    }

    // Keep the single session-based CSRF token intact per session
    // Rotating it on every POST breaks SPAs and multiple continuous AJAX calls
    res.locals.csrfToken = req.session.csrfToken;
  }

  next();
};

module.exports = csrfProtection;

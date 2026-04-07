/**
 * Lokerin Custom Dialog System
 * Menggantikan alert() dan confirm() bawaan browser dengan dialog yang sesuai tema
 */

(function() {
  // ── Inject Styles ──────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* === OVERLAY === */
    #lk-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
      opacity: 0; visibility: hidden;
      transition: opacity 0.22s ease, visibility 0.22s ease;
    }
    #lk-overlay.lk-open { opacity: 1; visibility: visible; }

    /* === DIALOG BOX === */
    .lk-dialog {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 24px 64px rgba(37, 99, 235, 0.16), 0 4px 16px rgba(0,0,0,0.08);
      width: 100%; max-width: 420px;
      transform: scale(0.93) translateY(10px);
      transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #lk-overlay.lk-open .lk-dialog { transform: scale(1) translateY(0); }

    /* === ICON AREA === */
    .lk-icon-wrap {
      display: flex; align-items: center; justify-content: center;
      padding: 28px 24px 0;
    }
    .lk-icon-circle {
      width: 60px; height: 60px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px;
    }
    .lk-icon-info    { background: #EFF6FF; color: #2563EB; }
    .lk-icon-success { background: #F0FDF4; color: #16A34A; }
    .lk-icon-warning { background: #FFFBEB; color: #D97706; }
    .lk-icon-error   { background: #FEF2F2; color: #DC2626; }
    .lk-icon-confirm { background: #EFF6FF; color: #2563EB; }

    /* === BODY === */
    .lk-body { padding: 16px 24px 24px; text-align: center; }
    .lk-title {
      font-size: 1rem; font-weight: 700; color: #0F172A;
      margin-bottom: 8px; line-height: 1.35;
    }
    .lk-message {
      font-size: 0.875rem; color: #64748B; line-height: 1.6;
    }

    /* === BUTTONS === */
    .lk-actions {
      display: flex; gap: 10px;
      padding: 0 24px 24px;
      justify-content: center;
    }
    .lk-btn {
      flex: 1; padding: 10px 20px;
      border-radius: 10px; border: none; cursor: pointer;
      font-size: 0.875rem; font-weight: 600;
      transition: all 0.15s ease;
      font-family: inherit;
    }
    .lk-btn-primary {
      background: #2563EB; color: #fff;
    }
    .lk-btn-primary:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .lk-btn-primary:active { transform: translateY(0); }

    .lk-btn-danger {
      background: #DC2626; color: #fff;
    }
    .lk-btn-danger:hover { background: #B91C1C; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220,38,38,0.3); }

    .lk-btn-cancel {
      background: #F1F5F9; color: #475569;
    }
    .lk-btn-cancel:hover { background: #E2E8F0; }

    /* === TOAST NOTIFICATION === */
    #lk-toast-container {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      z-index: 100000;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      pointer-events: none;
    }
    .lk-toast {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 18px;
      border-radius: 12px;
      background: #0F172A; color: #fff;
      font-size: 0.875rem; font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      min-width: 240px; max-width: 380px;
      pointer-events: auto;
      animation: lk-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .lk-toast.lk-toast-out { animation: lk-toast-out 0.25s ease forwards; }
    .lk-toast-icon { font-size: 17px; flex-shrink: 0; }
    .lk-toast-success { background: #166534; }
    .lk-toast-error   { background: #991B1B; }
    .lk-toast-warning { background: #92400E; }

    @keyframes lk-toast-in {
      from { opacity: 0; transform: translateY(16px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes lk-toast-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(8px) scale(0.95); }
    }
  `;
  document.head.appendChild(style);

  // ── Create Overlay DOM ─────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'lk-overlay';
  overlay.innerHTML = `
    <div class="lk-dialog" id="lk-dialog">
      <div class="lk-icon-wrap"><div class="lk-icon-circle" id="lk-icon"></div></div>
      <div class="lk-body">
        <div class="lk-title" id="lk-title"></div>
        <div class="lk-message" id="lk-message"></div>
      </div>
      <div class="lk-actions" id="lk-actions"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Create Toast Container ─────────────────────────────────────────────────
  const toastContainer = document.createElement('div');
  toastContainer.id = 'lk-toast-container';
  document.body.appendChild(toastContainer);

  // ── Internal helpers ───────────────────────────────────────────────────────
  const iconMap = {
    info:    { emoji: 'ℹ️',  cls: 'lk-icon-info' },
    success: { emoji: '✅',  cls: 'lk-icon-success' },
    warning: { emoji: '⚠️',  cls: 'lk-icon-warning' },
    error:   { emoji: '❌',  cls: 'lk-icon-error' },
    confirm: { emoji: '🗑️', cls: 'lk-icon-confirm' },
  };

  function openOverlay() { overlay.classList.add('lk-open'); }
  function closeOverlay() {
    overlay.classList.remove('lk-open');
    document.getElementById('lk-actions').innerHTML = '';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Gantikan alert() browser
   * @param {string} message - Pesan yang ditampilkan
   * @param {string} [type='info'] - 'info' | 'success' | 'warning' | 'error'
   * @param {string} [title] - Judul dialog (opsional)
   * @returns {Promise<void>}
   */
  window.lokerinAlert = function(message, type = 'info', title = null) {
    return new Promise(resolve => {
      const icon = iconMap[type] || iconMap.info;
      const el = document.getElementById('lk-icon');
      el.textContent = icon.emoji;
      el.className = 'lk-icon-circle ' + icon.cls;

      const defaultTitles = {
        info: 'Informasi', success: 'Berhasil!',
        warning: 'Peringatan', error: 'Terjadi Kesalahan'
      };
      document.getElementById('lk-title').textContent = title || defaultTitles[type] || 'Informasi';
      document.getElementById('lk-message').textContent = message;

      const actions = document.getElementById('lk-actions');
      actions.innerHTML = '';
      const okBtn = document.createElement('button');
      okBtn.className = 'lk-btn lk-btn-primary';
      okBtn.textContent = 'OK';
      okBtn.onclick = () => { closeOverlay(); resolve(); };
      actions.appendChild(okBtn);

      openOverlay();
      setTimeout(() => okBtn.focus(), 250);
    });
  };

  /**
   * Gantikan confirm() browser
   * @param {string} message - Pesan konfirmasi
   * @param {object} [options] - { title, confirmText, cancelText, danger }
   * @returns {Promise<boolean>}
   */
  window.lokerinConfirm = function(message, options = {}) {
    return new Promise(resolve => {
      const {
        title = 'Konfirmasi',
        confirmText = 'Ya, Lanjutkan',
        cancelText = 'Batal',
        danger = false,
      } = options;

      const icon = iconMap[danger ? 'error' : 'confirm'];
      const el = document.getElementById('lk-icon');
      el.textContent = icon.emoji;
      el.className = 'lk-icon-circle ' + icon.cls;

      document.getElementById('lk-title').textContent = title;
      document.getElementById('lk-message').textContent = message;

      const actions = document.getElementById('lk-actions');
      actions.innerHTML = '';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'lk-btn lk-btn-cancel';
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => { closeOverlay(); resolve(false); };

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'lk-btn ' + (danger ? 'lk-btn-danger' : 'lk-btn-primary');
      confirmBtn.textContent = confirmText;
      confirmBtn.onclick = () => { closeOverlay(); resolve(true); };

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);

      openOverlay();
      setTimeout(() => confirmBtn.focus(), 250);
    });
  };

  /**
   * Toast notification (alternatif ringan tanpa blocking)
   * @param {string} message
   * @param {string} [type='info'] - 'info' | 'success' | 'error' | 'warning'
   * @param {number} [duration=3500]
   */
  window.lokerinToast = function(message, type = 'info', duration = 3500) {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = 'lk-toast' + (type !== 'info' ? ' lk-toast-' + type : '');
    toast.innerHTML = `<span class="lk-toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('lk-toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  };

  // Tutup overlay jika klik di luar dialog
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeOverlay();
  });

  // Tutup dengan ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('lk-open')) {
      closeOverlay();
    }
  });
})();

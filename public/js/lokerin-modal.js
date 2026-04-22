/**
 * Lokerin Modal System
 * Sistem modal global yang reusable untuk konfirmasi dan alert
 */

(function() {
  // Inject modal HTML ke body
  function injectModal() {
    if (document.getElementById('lokerin-modal')) return;

    const modalHTML = `
<div id="lokerin-modal" style="display: none; position: fixed; inset: 0; z-index: 99999; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(3px); align-items: center; justify-content: center; padding: 1rem;">
  <div style="background: #fff; border-radius: 20px; box-shadow: 0 24px 64px rgba(37, 99, 235, 0.16); width: 100%; max-width: 420px; overflow: hidden; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;">
    <div style="padding: 28px 24px 0; display: flex; align-items: center; justify-content: center;">
      <div id="lk-modal-icon" style="width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px;">⚠️</div>
    </div>
    <div style="padding: 16px 24px 24px; text-align: center;">
      <h3 id="lk-modal-title" style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #111827;"></h3>
      <p id="lk-modal-message" style="margin: 0 0 24px; font-size: 14px; color: #6b7280;"></p>
      <div id="lk-modal-buttons" style="display: flex; gap: 12px;"></div>
    </div>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Close modal when clicking outside
    const modal = document.getElementById('lokerin-modal');
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Icon configurations
  const icons = {
    confirm: { emoji: '⚠️', bg: '#FEF2F2', color: '#DC2626' },
    success: { emoji: '✅', bg: '#F0FDF4', color: '#16A34A' },
    error:   { emoji: '❌', bg: '#FEF2F2', color: '#DC2626' },
    warning: { emoji: '⚠️', bg: '#FFFBEB', color: '#D97706' },
    info:    { emoji: 'ℹ️', bg: '#EFF6FF', color: '#2563EB' }
  };

  function closeModal() {
    const modal = document.getElementById('lokerin-modal');
    if (modal) modal.style.display = 'none';
  }

  function showModal(options) {
    injectModal();

    const modal = document.getElementById('lokerin-modal');
    const iconEl = document.getElementById('lk-modal-icon');
    const titleEl = document.getElementById('lk-modal-title');
    const messageEl = document.getElementById('lk-modal-message');
    const buttonsEl = document.getElementById('lk-modal-buttons');

    // Set icon
    const iconConfig = icons[options.type] || icons.info;
    iconEl.textContent = iconConfig.emoji;
    iconEl.style.background = iconConfig.bg;
    iconEl.style.color = iconConfig.color;

    // Set title and message
    titleEl.textContent = options.title || 'Konfirmasi';
    messageEl.textContent = options.message;

    // Set buttons
    buttonsEl.innerHTML = '';

    if (options.type === 'confirm') {
      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = options.cancelText || 'Batal';
      cancelBtn.style.cssText = 'flex: 1; padding: 12px; border: 1px solid #d1d5db; background: #fff; color: #374151; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;';
      cancelBtn.onmouseover = () => cancelBtn.style.background = '#f9fafb';
      cancelBtn.onmouseout = () => cancelBtn.style.background = '#fff';
      cancelBtn.onclick = () => {
        closeModal();
        if (options.onCancel) options.onCancel();
        if (options.resolve) options.resolve(false);
      };
      buttonsEl.appendChild(cancelBtn);

      // Confirm button
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = options.confirmText || 'Ya';
      const isDanger = options.danger;
      confirmBtn.style.cssText = `flex: 1; padding: 12px; border: none; background: ${isDanger ? '#ef4444' : '#3b82f6'}; color: #fff; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;`;
      confirmBtn.onmouseover = () => confirmBtn.style.opacity = '0.9';
      confirmBtn.onmouseout = () => confirmBtn.style.opacity = '1';
      confirmBtn.onclick = () => {
        closeModal();
        if (options.onConfirm) options.onConfirm();
        if (options.resolve) options.resolve(true);
      };
      buttonsEl.appendChild(confirmBtn);
    } else {
      // Alert mode - single OK button
      const okBtn = document.createElement('button');
      okBtn.textContent = options.buttonText || 'OK';
      const btnColor = options.type === 'error' ? '#ef4444' : options.type === 'success' ? '#16A34A' : options.type === 'warning' ? '#D97706' : '#3b82f6';
      okBtn.style.cssText = `width: 100%; padding: 12px; border: none; background: ${btnColor}; color: #fff; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;`;
      okBtn.onmouseover = () => okBtn.style.opacity = '0.9';
      okBtn.onmouseout = () => okBtn.style.opacity = '1';
      okBtn.onclick = () => {
        closeModal();
        if (options.onClose) options.onClose();
        if (options.resolve) options.resolve();
      };
      buttonsEl.appendChild(okBtn);
    }

    // Show modal
    modal.style.display = 'flex';
  }

  // Public API: lokerinConfirm
  window.lokerinConfirm = function(message, options = {}) {
    return new Promise((resolve) => {
      showModal({
        type: 'confirm',
        message,
        title: options.title || 'Konfirmasi',
        confirmText: options.confirmText || 'Ya',
        cancelText: options.cancelText || 'Batal',
        danger: options.danger || false,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
        resolve
      });
    });
  };

  // Public API: lokerinAlert
  window.lokerinAlert = function(message, type = 'info', title = null) {
    return new Promise((resolve) => {
      showModal({
        type,
        message,
        title: title || (type === 'success' ? 'Berhasil' : type === 'error' ? 'Error' : type === 'warning' ? 'Peringatan' : 'Informasi'),
        buttonText: 'OK',
        resolve
      });
    });
  };

  // Auto-inject on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModal);
  } else {
    injectModal();
  }
})();

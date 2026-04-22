/**
 * Profile Image Upload Handler
 * Menangani upload foto profil dan banner
 */
(function() {
  'use strict';

  function showAlert(message) {
    if (typeof lokerinAlert !== 'undefined') {
      lokerinAlert(message, 'error');
    } else {
      alert(message);
    }
  }

  function initUploadHandlers() {
    // Profile image upload
    const profileInput = document.getElementById('profile-file-input');
    if (profileInput) {
      profileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = function(ev) {
          const avatarImg = document.querySelector('.profile-avatar');
          if (avatarImg) avatarImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('profileImage', file);

        fetch('/profile/upload-image', { method: 'POST', body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setTimeout(() => { window.location.href = '/profile?t=' + Date.now(); }, 300);
            } else {
              showAlert(data.error || 'Gagal upload foto profil');
              location.reload();
            }
          })
          .catch(() => {
            showAlert('Terjadi kesalahan saat upload');
            location.reload();
          });
      });
    }

    // Banner image upload
    const bannerInput = document.getElementById('banner-file-input');
    if (bannerInput) {
      bannerInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(ev) {
          const banner = document.getElementById('profile-banner');
          if (banner) banner.style.backgroundImage = `url(${ev.target.result})`;
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('bannerImage', file);

        fetch('/profile/upload-banner', { method: 'POST', body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setTimeout(() => { window.location.href = '/profile?t=' + Date.now(); }, 300);
            } else {
              showAlert(data.error || 'Gagal upload banner');
            }
          })
          .catch(() => showAlert('Terjadi kesalahan saat upload'));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUploadHandlers);
  } else {
    initUploadHandlers();
  }
})();

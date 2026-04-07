/**
 * Profile Image Upload Handler
 * Menangani upload foto profil dan banner
 */

(function() {
  'use strict';

  console.log('🚀 Profile upload script loaded');

  // Wait for DOM to be fully loaded
  function initUploadHandlers() {
    console.log('🟢 Initializing upload handlers...');

    // Profile image upload
    const profileInput = document.getElementById('profile-file-input');
    if (profileInput) {
      console.log('✅ Profile file input found, attaching listener');
      profileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        console.log('📸 Starting profile image upload:', file.name);

        const formData = new FormData();
        formData.append('profileImage', file);

        // Preview langsung
        const reader = new FileReader();
        reader.onload = function(e) {
          const avatarImg = document.querySelector('.profile-avatar');
          if (avatarImg) {
            avatarImg.src = e.target.result;
          }
        };
        reader.readAsDataURL(file);

        fetch('/profile/upload-image', {
          method: 'POST',
          body: formData
        })
        .then(response => {
          console.log('📡 Response status:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('📦 Upload response:', data);
          if (data.success) {
            console.log('✅ Profile image uploaded successfully:', data.profile_image);
            setTimeout(() => {
              window.location.href = '/profile?t=' + Date.now();
            }, 300);
          } else {
            console.error('❌ Upload failed:', data.error);
            lokerinAlert(data.error || 'Gagal upload foto profil', 'error');
            location.reload();
          }
        })
        .catch(error => {
          console.error('❌ Error uploading:', error);
          lokerinAlert('Terjadi kesalahan saat upload', 'error');
          location.reload();
        });
      });
    } else {
      console.error('❌ Profile file input NOT found!');
    }

    // Banner image upload
    const bannerInput = document.getElementById('banner-file-input');
    if (bannerInput) {
      console.log('✅ Banner file input found, attaching listener');
      bannerInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        console.log('🖼️ Starting banner image upload:', file.name);

        const formData = new FormData();
        formData.append('bannerImage', file);

        // Tampilkan preview langsung
        const reader = new FileReader();
        reader.onload = function(e) {
          const banner = document.getElementById('profile-banner');
          banner.style.backgroundImage = `url(${e.target.result})`;
        };
        reader.readAsDataURL(file);

        fetch('/profile/upload-banner', {
          method: 'POST',
          body: formData
        })
        .then(response => {
          console.log('📡 Response status:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('📦 Upload response:', data);
          if (data.success) {
            console.log('✅ Banner image uploaded successfully:', data.banner_image);
            setTimeout(() => {
              window.location.href = '/profile?t=' + Date.now();
            }, 300);
          } else {
            console.error('❌ Upload failed:', data.error);
            lokerinAlert(data.error || 'Gagal upload banner', 'error');
          }
        })
        .catch(error => {
          console.error('❌ Error uploading:', error);
          lokerinAlert('Terjadi kesalahan saat upload', 'error');
        });
      });
    } else {
      console.error('❌ Banner file input NOT found!');
    }

    console.log('✅ All upload handlers initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUploadHandlers);
  } else {
    initUploadHandlers();
  }
})();

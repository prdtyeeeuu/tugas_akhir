/**
 * Main JavaScript
 * Client-side interactions
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {

  // Auto-hide alert messages after 5 seconds
  const alerts = document.querySelectorAll('[data-alert]');
  alerts.forEach(function(alert) {
    setTimeout(function() {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(function() {
        alert.remove();
      }, 500);
    }, 5000);
  });

  // Confirm before submitting application
  const applyForms = document.querySelectorAll('form[action*="/jobs/apply/"]');
  applyForms.forEach(function(form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const ok = await lokerinConfirm('Apakah Anda yakin ingin melamar pekerjaan ini?', {
        title: 'Konfirmasi Lamaran',
        confirmText: 'Ya, Lamar Sekarang',
        cancelText: 'Batal'
      });
      if (ok) form.submit();
    });
  });

  // Image preview before upload (profile & banner)
  const fileInputs = document.querySelectorAll('input[type="file"][accept="image/*"]');
  fileInputs.forEach(function(input) {
    input.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          lokerinAlert('Ukuran file terlalu besar. Maksimal 5MB', 'warning', 'File Terlalu Besar');
          e.target.value = '';
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          lokerinAlert('File harus berupa gambar (JPG, PNG, WEBP, dll)', 'error', 'Format Tidak Valid');
          e.target.value = '';
          return;
        }
      }
    });
  });

  // Dropdown toggle functionality
  window.toggleDropdown = function(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const menu = dropdown.querySelector('[id$="-menu"]');
    if (!menu) return;
    
    const allMenus = document.querySelectorAll('[id$="-menu"]');

    // Close all other dropdowns
    allMenus.forEach(m => {
      if (m !== menu) {
        m.classList.add('hidden');
      }
    });

    // Toggle current dropdown
    menu.classList.toggle('hidden');
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const dropdowns = document.querySelectorAll('[id$="-dropdown"]');
    const menus = document.querySelectorAll('[id$="-menu"]');

    dropdowns.forEach((dropdown, index) => {
      if (!dropdown.contains(event.target)) {
        menus[index].classList.add('hidden');
      }
    });
  });

  // Banner upload handler - ONLY if not on profile page (profile.ejs has its own handler)
  const bannerInput = document.getElementById('banner-file-input');
  const isProfilePage = window.location.pathname === '/profile';
  
  if (bannerInput && !isProfilePage) {
    bannerInput.addEventListener('change', async function() {
      if (this.files.length > 0) {
        const formData = new FormData();
        formData.append('bannerImage', this.files[0]);

        // Preview langsung sebelum upload
        const reader = new FileReader();
        reader.onload = function(e) {
          const banner = document.getElementById('profile-banner');
          if (banner) {
            banner.style.backgroundImage = `url(${e.target.result})`;
            banner.style.backgroundColor = '';
          }
        };
        reader.readAsDataURL(this.files[0]);

        try {
          const response = await fetch('/profile/upload-banner', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Update dengan URL server (dengan timestamp untuk cache bust)
            const banner = document.getElementById('profile-banner');
            if (banner && data.banner_image) {
              banner.style.backgroundImage = `url('/images/banners/${data.banner_image}?t=${Date.now()}')`;
            }
            // Tutup dropdown jika ada
            const menu = document.getElementById('banner-menu');
            if (menu) {
              menu.classList.add('hidden');
            }
          } else {
            lokerinAlert(data.error || 'Gagal mengupload banner', 'error');
            window.location.reload();
          }
        } catch (error) {
          console.error('Error uploading banner:', error);
          lokerinAlert('Terjadi kesalahan saat mengupload banner', 'error');
          window.location.reload();
        }
      }
    });
  }

  // Profile upload handler - ONLY if not on profile page (profile.ejs has its own handler)
  const profileInput = document.getElementById('profile-file-input');
  if (profileInput && !isProfilePage) {
    profileInput.addEventListener('change', async function() {
      if (this.files.length > 0) {
        const file = this.files[0];
        const formData = new FormData();
        formData.append('profileImage', file);

        // Preview langsung
        const reader = new FileReader();
        reader.onload = function(e) {
          const avatarImg = document.querySelector('.profile-avatar');
          if (avatarImg) {
            avatarImg.src = e.target.result;
          } else {
            // Jika belum ada avatar, buat elemen img
            const avatarWrapper = document.querySelector('.avatar-wrapper');
            if (avatarWrapper) {
              // Hapus placeholder jika ada
              const placeholder = avatarWrapper.querySelector('div[style*="background"]');
              if (placeholder) {
                placeholder.remove();
              }
              const img = document.createElement('img');
              img.src = e.target.result;
              img.alt = 'Profile';
              img.className = 'profile-avatar';
              avatarWrapper.insertBefore(img, avatarWrapper.firstChild);
            }
          }
        };
        reader.readAsDataURL(file);

        try {
          const response = await fetch('/profile/upload-image', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Update dengan URL server
            const avatarImg = document.querySelector('.profile-avatar');
            if (avatarImg && data.profile_image) {
              avatarImg.src = `/images/profiles/${data.profile_image}?t=${Date.now()}`;
            }
          } else {
            lokerinAlert(data.error || 'Gagal mengupload foto profil', 'error');
            window.location.reload();
          }
        } catch (error) {
          console.error('Error uploading profile image:', error);
          lokerinAlert('Terjadi kesalahan saat mengupload foto profil', 'error');
          window.location.reload();
        }
      }
    });
  }

  // Banner color selection handler - ONLY if not on profile page (profile.ejs has its own handler)
  if (!isProfilePage) {
    window.selectBannerColor = async function(color) {
    const banner = document.getElementById('profile-banner');

    // Update banner appearance immediately
    if (banner) {
      banner.style.backgroundColor = color;
      banner.style.backgroundImage = 'none';

      // Update active state on color swatches
      document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.remove('active');
      });
      if (event && event.target) {
        event.target.classList.add('active');
      }
    }

    // Submit to server using fetch (no page reload)
    try {
      const response = await fetch('/profile/set-banner-color', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ color })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - close dropdown menu
        const bannerMenu = document.getElementById('banner-menu');
        if (bannerMenu) {
          bannerMenu.classList.add('hidden');
        }
      } else {
        lokerinAlert(data.error || 'Gagal mengubah warna banner', 'error');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating banner color:', error);
      lokerinAlert('Terjadi kesalahan saat mengubah warna banner', 'error');
      window.location.reload();
    }
  };
  }

  // Toggle edit modal
  window.toggleEditMode = function() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
      if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
      } else {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Enable scrolling
      }
    }
  };

  // Close modal when clicking outside
  document.addEventListener('click', function(event) {
    const modal = document.getElementById('edit-modal');
    if (modal && event.target === modal) {
      toggleEditMode();
    }
  });

  // Close modal on ESC key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      const modal = document.getElementById('edit-modal');
      if (modal && modal.style.display === 'flex') {
        toggleEditMode();
      }
    }
  });

});

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

      // Check if lokerinConfirm is available
      if (typeof lokerinConfirm !== 'undefined') {
        const ok = await lokerinConfirm('Apakah Anda yakin ingin melamar pekerjaan ini?', {
          title: 'Konfirmasi Lamaran',
          confirmText: 'Ya, Lamar Sekarang',
          cancelText: 'Batal'
        });
        if (ok) form.submit();
      } else {
        // Fallback to native confirm
        if (confirm('Apakah Anda yakin ingin melamar pekerjaan ini?')) {
          form.submit();
        }
      }
    });
  });

  // Image preview/validation before upload (global, but skip if on profile page)
  const fileInputs = document.querySelectorAll('input[type="file"][accept="image/*"]');
  const isProfilePage = window.location.pathname === '/profile';

  fileInputs.forEach(function(input) {
    input.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          if (typeof lokerinAlert !== 'undefined') {
            lokerinAlert('Ukuran file terlalu besar. Maksimal 5MB', 'warning', 'File Terlalu Besar');
          } else {
            alert('Ukuran file terlalu besar. Maksimal 5MB');
          }
          e.target.value = '';
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          if (typeof lokerinAlert !== 'undefined') {
            lokerinAlert('File harus berupa gambar (JPG, PNG, WEBP, dll)', 'error', 'Format Tidak Valid');
          } else {
            alert('File harus berupa gambar (JPG, PNG, WEBP, dll)');
          }
          e.target.value = '';
          return;
        }
      }
    });
  });

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

  // Banner/Profile upload handlers are in profile-upload.js to avoid conflicts
  // Only keep dropdown and modal functionality here

  // Dropdown toggle functionality
  window.toggleDropdown = function(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const menu = dropdown.querySelector('[id$="-menu"]');
    if (!menu) return;

    const allMenus = document.querySelectorAll('[id$="-menu"]');
    allMenus.forEach(m => {
      if (m !== menu) {
        m.classList.add('hidden');
      }
    });

    menu.classList.toggle('hidden');
  };

  // Banner color selection (global function for profile page)
  window.selectBannerColor = async function(color) {
    const banner = document.getElementById('profile-banner');
    if (banner) {
      banner.style.backgroundColor = color;
      banner.style.backgroundImage = 'none';
    }

    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.remove('active');
    });
    if (event && event.target) {
      event.target.classList.add('active');
    }

    try {
      const response = await fetch('/profile/set-banner-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ color })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const bannerMenu = document.getElementById('banner-menu');
        if (bannerMenu) bannerMenu.classList.add('hidden');
      } else if (typeof lokerinAlert !== 'undefined') {
        lokerinAlert(data.error || 'Gagal mengubah warna banner', 'error');
      }
    } catch (error) {
      console.error('Error updating banner color:', error);
    }
  };

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

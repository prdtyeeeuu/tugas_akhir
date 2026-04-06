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
    form.addEventListener('submit', function(e) {
      if (!confirm('Apakah Anda yakin ingin melamar pekerjaan ini?')) {
        e.preventDefault();
      }
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
          alert('Ukuran file terlalu besar. Maksimal 5MB');
          e.target.value = '';
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('File harus berupa gambar');
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

  // Banner upload handler
  const bannerInput = document.getElementById('banner-file-input');
  if (bannerInput) {
    bannerInput.addEventListener('change', async function() {
      if (this.files.length > 0) {
        const formData = new FormData();
        formData.append('bannerImage', this.files[0]);

        try {
          const response = await fetch('/profile/upload-banner', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
          });

          if (response.ok) {
            // Update banner immediately
            const bannerDiv = document.getElementById('banner-display');
            if (bannerDiv) {
              const fileName = this.files[0].name;
              // Reload page to show updated banner
              window.location.reload();
            }
          } else {
            alert('Gagal mengupload banner');
          }
        } catch (error) {
          console.error('Error uploading banner:', error);
          alert('Terjadi kesalahan saat mengupload banner');
        }
      }
    });
  }

  // Profile upload handler
  const profileInput = document.getElementById('profile-file-input');
  if (profileInput) {
    profileInput.addEventListener('change', async function() {
      if (this.files.length > 0) {
        const formData = new FormData();
        formData.append('profileImage', this.files[0]);

        try {
          const response = await fetch('/profile/upload-image', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
          });

          if (response.ok) {
            // Reload page to show updated profile image
            window.location.reload();
          } else {
            alert('Gagal mengupload foto profil');
          }
        } catch (error) {
          console.error('Error uploading profile image:', error);
          alert('Terjadi kesalahan saat mengupload foto profil');
        }
      }
    });
  }

  // Banner color selection handler
  window.selectBannerColor = async function(color) {
    const bannerDiv = document.getElementById('banner-display');
    
    // Update banner appearance immediately
    if (bannerDiv) {
      bannerDiv.style.backgroundColor = color;
      bannerDiv.style.backgroundImage = 'none';
      
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
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'same-origin',
        body: `color=${encodeURIComponent(color)}`
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Success - close dropdown menu
        const bannerMenu = document.getElementById('banner-menu');
        if (bannerMenu) {
          bannerMenu.classList.add('hidden');
        }
      } else {
        alert(data.error || 'Gagal mengubah warna banner');
        // Reload page to restore original state
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating banner color:', error);
      alert('Terjadi kesalahan saat mengubah warna banner');
      // Reload page to restore original state
      window.location.reload();
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

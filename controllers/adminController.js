const db = require('../config/db');

const adminController = {
  // Tampilkan dashboard admin
  showDashboard: async (req, res, next) => {
    try {
      // Get counts
      const userCountRows = await db.query('SELECT COUNT(*) as count FROM users');
      const jobCountRows = await db.query('SELECT COUNT(*) as count FROM jobs');
      const applicationCountRows = await db.query('SELECT COUNT(*) as count FROM applications');
      
      const stats = {
        users: userCountRows[0].count,
        jobs: jobCountRows[0].count,
        applications: applicationCountRows[0].count
      };

      // Get recent jobs
      const recentJobs = await db.query(`
        SELECT j.*, u.name as company_name 
        FROM jobs j 
        LEFT JOIN users u ON j.hr_id = u.id 
        ORDER BY j.created_at DESC LIMIT 5
      `);

      res.render('pages/admin/dashboard', {
        title: 'Admin Dashboard | Lokerin',
        stats,
        recentJobs
      });
    } catch (error) {
      next(error);
    }
  },

  // Tampilkan daftar users
  showUsers: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      const countResult = await db.query('SELECT COUNT(*) as count FROM users');
      const totalUsers = countResult[0].count;
      const totalPages = Math.ceil(totalUsers / limit);

      const users = await db.query(
        'SELECT id, name, email, role, created_at, status FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );

      res.render('pages/admin/users', {
        title: 'Manage Users | Lokerin',
        users,
        pagination: {
          page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Hapus user
  deleteUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await db.query('DELETE FROM users WHERE id = ?', [id]);
      res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  },

  // Form tambah user
  showCreateUser: (req, res) => {
    res.render('pages/admin/user-form', {
      title: 'Tambah Pengguna | Lokerin',
      user: null
    });
  },

  // Proses tambah user
  createUser: async (req, res, next) => {
    try {
      const { name, email, password, role, status } = req.body;
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password || 'password123', 10);
      
      await db.query(
        'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role, status || 'active']
      );
      res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  },

  // Form edit user
  showEditUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const results = await db.query('SELECT id, name, email, role, status FROM users WHERE id = ?', [id]);
      if (results.length === 0) return res.status(404).send('User not found');
      
      res.render('pages/admin/user-form', {
        title: 'Edit Pengguna | Lokerin',
        user: results[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Proses edit user
  updateUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, email, role, status, password } = req.body;
      
      if (password && password.trim() !== '') {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
          'UPDATE users SET name = ?, email = ?, role = ?, status = ?, password = ? WHERE id = ?',
          [name, email, role, status, hashedPassword, id]
        );
      } else {
        await db.query(
          'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?',
          [name, email, role, status, id]
        );
      }
      res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  },

  // Suspend/Unsuspend user
  suspendUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'suspend' or 'activate'
      const status = action === 'suspend' ? 'suspended' : 'active';
      
      if (parseInt(id) === req.user.id) {
        return res.status(400).send('Cannot suspend your own account');
      }

      await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
      res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  },

  // Beri peringatan ke user
  warnUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      await db.query('INSERT INTO warnings (user_id, message) VALUES (?, ?)', [id, message]);
      res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  },

  // Tampilkan daftar jobs
  showJobs: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      const countResult = await db.query('SELECT COUNT(*) as count FROM jobs');
      const totalJobs = countResult[0].count;
      const totalPages = Math.ceil(totalJobs / limit);

      const jobs = await db.query(`
        SELECT j.id, j.title, j.company, j.location, j.type, j.status, j.created_at, u.name as hr_name
        FROM jobs j
        LEFT JOIN users u ON j.hr_id = u.id
        ORDER BY j.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      res.render('pages/admin/jobs', {
        title: 'Manage Jobs | Lokerin',
        jobs,
        pagination: {
          page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Form tambah job
  showCreateJob: async (req, res, next) => {
    try {
      const hrs = await db.query("SELECT id, name FROM users WHERE role = 'hr'");
      res.render('pages/admin/job-form', {
        title: 'Tambah Lowongan | Lokerin',
        job: null,
        hrs
      });
    } catch (error) {
      next(error);
    }
  },

  // Proses tambah job
  createJob: async (req, res, next) => {
    try {
      const { title, company, location, type, category, status, hr_id, description, salary_min, salary_max, deadline } = req.body;
      await db.query(
        'INSERT INTO jobs (title, company, location, type, category, status, hr_id, description, salary_min, salary_max, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, company, location, type, category, status || 'active', hr_id || null, description, salary_min || null, salary_max || null, deadline || null]
      );
      res.redirect('/admin/jobs');
    } catch (error) {
      next(error);
    }
  },

  // Form edit job
  showEditJob: async (req, res, next) => {
    try {
      const { id } = req.params;
      const results = await db.query('SELECT * FROM jobs WHERE id = ?', [id]);
      if (results.length === 0) return res.status(404).send('Job not found');
      
      const hrs = await db.query("SELECT id, name FROM users WHERE role = 'hr'");
      
      res.render('pages/admin/job-form', {
        title: 'Edit Lowongan | Lokerin',
        job: results[0],
        hrs
      });
    } catch (error) {
      next(error);
    }
  },

  // Proses edit job
  updateJob: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, company, location, type, category, status, hr_id, description, salary_min, salary_max, deadline } = req.body;
      
      await db.query(
        'UPDATE jobs SET title=?, company=?, location=?, type=?, category=?, status=?, hr_id=?, description=?, salary_min=?, salary_max=?, deadline=? WHERE id=?',
        [title, company, location, type, category, status, hr_id || null, description, salary_min || null, salary_max || null, deadline || null, id]
      );
      res.redirect('/admin/jobs');
    } catch (error) {
      next(error);
    }
  },

  // Suspend/Unsuspend Job
  suspendJob: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'suspend' or 'activate'
      const status = action === 'suspend' ? 'suspended' : 'active';
      
      await db.query('UPDATE jobs SET status = ? WHERE id = ?', [status, id]);
      res.redirect('/admin/jobs');
    } catch (error) {
      next(error);
    }
  },

  // Hapus job
  deleteJob: async (req, res, next) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM jobs WHERE id = ?', [id]);
      res.redirect('/admin/jobs');
    } catch (error) {
      next(error);
    }
  },

  // Tampilkan daftar gambar
  showImages: async (req, res, next) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const categories = ['banners', 'portfolios', 'profiles'];
      const imagesByCategory = {};

      for (const category of categories) {
        const dirPath = path.join(__dirname, '..', 'public', 'images', category);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        const files = fs.readdirSync(dirPath);
        const images = [];
        
        for (const filename of files) {
          if (filename.startsWith('.')) continue;
          
          const stats = fs.statSync(path.join(dirPath, filename));
          let uploader_name = 'Tidak diketahui';
          
          try {
            if (category === 'profiles') {
              const results = await db.query('SELECT name, role FROM users WHERE profile_image = ? LIMIT 1', [filename]);
              if (results && results.length > 0) uploader_name = `${results[0].name} (${results[0].role})`;
            } else if (category === 'banners') {
              const results = await db.query('SELECT name, role FROM users WHERE banner_image = ? LIMIT 1', [filename]);
              if (results && results.length > 0) uploader_name = `${results[0].name} (${results[0].role})`;
            } else if (category === 'portfolios') {
              const results = await db.query('SELECT u.name, u.role FROM portfolios p JOIN users u ON p.user_id = u.id WHERE p.image_url = ? LIMIT 1', [filename]);
              if (results && results.length > 0) uploader_name = `${results[0].name} (${results[0].role})`;
            }
          } catch (dbError) {
            console.error(`DB Error while fetching uploader for ${filename}:`, dbError);
          }
          
          images.push({
            filename,
            category,
            size: (stats.size / 1024).toFixed(2) + ' KB',
            created_at: stats.birthtime,
            uploader_name
          });
        }
        
        imagesByCategory[category] = images;
      }
      
      res.render('pages/admin/images', {
        title: 'Manajemen Gambar | Lokerin',
        imagesByCategory
      });
    } catch (error) {
      next(error);
    }
  },

  // Hapus gambar
  deleteImage: (req, res, next) => {
    const fs = require('fs');
    const path = require('path');
    const { category, filename } = req.params;
    
    try {
      const filepath = path.join(__dirname, '..', 'public', 'images', category, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      res.redirect('/admin/images');
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminController;

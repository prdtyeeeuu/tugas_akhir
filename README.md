# Lokerin - Platform Pencarian Kerja

Lokerin adalah platform pencarian kerja yang menghubungkan pencari kerja dengan HR/perusahaan. Dibangun dengan Node.js, Express.js, EJS, Tailwind CSS, dan MySQL.

## 🚀 Fitur Utama

### 🔐 Authentication
- **Register**: Pendaftaran user baru dengan otomatis login
- **Login**: Autentikasi menggunakan JWT session
- **Logout**: Hapus session dan token
- **Password Hashing**: Menggunakan bcryptjs
- **Protected Routes**: Middleware untuk proteksi halaman

### 💼 Job Portal
- **Dashboard**: Hero section dengan search bar, kategori pekerjaan, dan rekomendasi job
- **Find Jobs**: Browse semua lowongan dengan filter kategori dan search
- **Apply Job**: Lamar pekerjaan (harus login terlebih dahulu)
- **Applications**: Lihat daftar lamaran dan statusnya (pending/diterima/ditolak)

### 👤 Profile Management
- **View Profile**: Lihat profil pribadi
- **Edit Profile**: Update nama dan bio
- **Upload Profile Image**: Upload foto profil dari device
- **Upload Banner**: Upload gambar banner profil

## 📁 Struktur Project

```
lokerin/
├── app.js                      # Main application entry point
├── config/
│   └── db.js                  # Database configuration & connection
├── controllers/
│   ├── authController.js      # Authentication logic
│   ├── jobController.js       # Job & application logic
│   └── profileController.js   # Profile management logic
├── models/
│   ├── User.js                # User model
│   ├── Job.js                 # Job model
│   └── Application.js         # Application model
├── routes/
│   ├── authRoutes.js          # Auth routes
│   ├── jobRoutes.js           # Job routes
│   └── profileRoutes.js       # Profile routes
├── middleware/
│   └── auth.js                # JWT & session middleware
├── views/
│   ├── layouts/
│   │   └── main.ejs           # Main layout
│   ├── partials/
│   │   ├── navbar.ejs         # Navbar component
│   │   └── footer.ejs         # Footer component
│   └── pages/
│       ├── dashboard.ejs      # Dashboard page
│       ├── jobs.ejs           # Find Jobs page
│       ├── applications.ejs   # Applications page
│       ├── profile.ejs        # Profile page
│       ├── 404.ejs            # 404 error page
│       ├── error.ejs          # Error page
│       └── auth/
│           ├── login.ejs      # Login page
│           └── register.ejs   # Register page
├── public/
│   ├── css/
│   │   ├── input.css          # Tailwind source
│   │   └── output.css         # Compiled Tailwind
│   ├── js/
│   │   └── main.js            # Client-side JavaScript
│   └── images/
│       ├── profiles/          # Profile images
│       └── banners/           # Banner images
├── database/
│   └── seed.js                # Database migration & seed script
├── .env                       # Environment variables
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies
├── tailwind.config.js         # Tailwind configuration
└── postcss.config.js          # PostCSS configuration
```

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js + Express.js
- **Template Engine**: EJS
- **Styling**: Tailwind CSS
- **Database**: MySQL (mysql2)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Environment Config**: dotenv

## 📦 Instalasi

### Prerequisites
- Node.js (v14 atau lebih baru)
- MySQL (v5.7 atau lebih baru)

### Langkah Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd lokerin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   # File .env sudah ada, sesuaikan konfigurasi database
   # Edit .env dan sesuaikan DB_USER, DB_PASSWORD
   ```

4. **Setup database**
   ```bash
   # Pastikan MySQL sudah berjalan
   npm run seed
   ```
   
   Script ini akan:
   - Membuat database `lokerin_db`
   - Membuat tabel-tabel (users, jobs, applications)
   - Menambahkan data dummy untuk testing

5. **Build CSS dengan Tailwind**
   ```bash
   npm run build:css
   ```
   
   Command ini akan watch dan compile Tailwind CSS secara otomatis.

6. **Jalankan aplikasi**
   ```bash
   # Production
   npm start
   
   # Development (dengan auto-reload, perlu nodemon)
   npm run dev
   ```

7. **Akses aplikasi**
   ```
   http://localhost:3000
   ```

## 🔑 Akun Dummy

Setelah menjalankan seed script, Anda bisa login dengan:

- **Email**: `user@test.com`
- **Password**: `password123`

## 🗄️ Database Schema

### Tabel Users
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- password (VARCHAR, hashed)
- profile_image (VARCHAR)
- banner_image (VARCHAR)
- bio (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabel Jobs
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- title (VARCHAR)
- company (VARCHAR)
- location (VARCHAR)
- category (VARCHAR)
- type (ENUM: Full-time, Part-time, Remote, Contract, Internship)
- description (TEXT)
- hr_id (INT, FOREIGN KEY -> users.id)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabel Applications
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- user_id (INT, FOREIGN KEY -> users.id)
- job_id (INT, FOREIGN KEY -> jobs.id)
- status (ENUM: pending, diterima, ditolak)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- UNIQUE: (user_id, job_id)
```

## 🎨 Design System

### Color Palette
- **Primary**: `#FFFFFF` (Putih)
- **Secondary**: `#ADCEFF` (Biru muda)
- **Gradient**: `#ADCEFF` → `#C3ADFF` (Hero section)

### Style
- Modern, clean, minimal
- Rounded corners (`rounded-xl`, `rounded-2xl`)
- Soft shadows (`shadow-sm`, `shadow-lg`)
- Generous spacing dan padding
- Responsive (mobile & desktop)

## 📝 API Routes

### Authentication
```
GET  /login          - Halaman login
POST /login          - Proses login
GET  /register       - Halaman register
POST /register       - Proses register
GET  /logout         - Logout
```

### Jobs
```
GET  /               - Dashboard
GET  /jobs           - Find Jobs (dengan filter opsional)
POST /jobs/apply/:id - Lamar pekerjaan (auth required)
```

### Applications
```
GET  /applications   - Lamaran Saya (auth required)
```

### Profile
```
GET  /profile              - Halaman profil (auth required)
POST /profile/update       - Update data profil (auth required)
POST /profile/upload-image - Upload foto profil (auth required)
POST /profile/upload-banner - Upload banner (auth required)
POST /profile/remove-image - Hapus foto profil (auth required)
POST /profile/remove-banner - Hapus banner (auth required)
```

## 🔒 Security Features

- Password hashing dengan bcryptjs (10 rounds)
- JWT token dengan expiry 7 hari
- Session-based authentication
- Protected routes dengan middleware
- SQL injection prevention (parameterized queries)
- XSS prevention (EJS auto-escaping)
- File upload validation (type & size)

## 🚀 Development Tips

### Menambah Job Baru (Manual via Database)
```sql
INSERT INTO jobs (title, company, location, category, type, description, hr_id) 
VALUES ('Job Title', 'Company Name', 'Location', 'Category', 'Full-time', 'Description', 2);
```

### Reset Database
```bash
# Drop dan recreate database
mysql -u root -p -e "DROP DATABASE lokerin_db; CREATE DATABASE lokerin_db;"
npm run seed
```

### Build CSS untuk Production
```bash
# One-time build
npx tailwindcss -i ./public/css/input.css -o ./public/css/output.css --minify
```

## 📄 License

ISC

## 👨‍💻 Author

Dibangun untuk tugas akhir

---

**Lokerin** - Temukan pekerjaan impianmu! 🚀

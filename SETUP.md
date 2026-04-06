# 🚀 Quick Start Guide - Lokerin

## Prerequisites
1. **Node.js** installed (v14+)
2. **MySQL** running on your system

## Step-by-Step Setup

### 1. Configure Database Credentials

Edit the `.env` file and update your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root          # Change to your MySQL username
DB_PASSWORD=          # Change to your MySQL password
DB_NAME=lokerin_db
```

### 2. Seed Database

Run the seed script to create database, tables, and dummy data:

```bash
npm run seed
```

This will:
- ✅ Create `lokerin_db` database
- ✅ Create tables: `users`, `jobs`, `applications`
- ✅ Insert dummy data for testing

**Dummy Account:**
- Email: `user@test.com`
- Password: `password123`

### 3. Start the Application

```bash
# Production mode
npm start

# Or development mode (if you have nodemon)
npm run dev
```

### 4. Access the Application

Open your browser and visit:
```
http://localhost:3000
```

## Troubleshooting

### MySQL Access Denied
- Make sure MySQL service is running
- Check your credentials in `.env` file
- Test MySQL connection: `mysql -u root -p`

### Port Already in Use
- Change the `PORT` in `.env` file
- Or kill the process using port 3000

### CSS Not Loading
- The CSS file is already built in `public/css/output.css`
- No need to run Tailwind build manually

## Features to Test

1. **Register** - Create a new account at `/register`
2. **Login** - Login at `/login`
3. **Dashboard** - Browse jobs on homepage
4. **Find Jobs** - Search and filter jobs
5. **Apply** - Apply to jobs (requires login)
6. **My Applications** - View application status
7. **Profile** - Update profile, upload image/banner

## Database Reset

If you need to reset the database:

```bash
# Drop database manually in MySQL
mysql -u root -p -e "DROP DATABASE lokerin_db;"

# Run seed again
npm run seed
```

---

**Enjoy using Lokerin!** 🎉

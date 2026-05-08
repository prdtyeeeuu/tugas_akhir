const { query } = require('../config/db');

(async () => {
  try {
    await query("ALTER TABLE applications MODIFY COLUMN status ENUM('pending','review','interview','offering','diterima','ditolak') DEFAULT 'pending';");
    console.log('Enum updated successfully');
  } catch(e) {
    console.error(e);
  }
  process.exit();
})();

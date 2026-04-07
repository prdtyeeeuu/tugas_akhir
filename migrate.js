const db = require('./config/db');

async function runMigration() {
  const columns = [
    "ADD COLUMN phone VARCHAR(20) NULL",
    "ADD COLUMN address VARCHAR(255) NULL",
    "ADD COLUMN expected_salary_min INT NULL",
    "ADD COLUMN expected_salary_max INT NULL",
    "ADD COLUMN open_to_work TINYINT(1) DEFAULT 1",
    "ADD COLUMN work_preferences TEXT NULL",
    "ADD COLUMN skills TEXT NULL",
    "ADD COLUMN educations TEXT NULL",
    "ADD COLUMN experiences TEXT NULL"
  ];

  for (const col of columns) {
    try {
      console.log(`Executing: ALTER TABLE users ${col}`);
      await db.query(`ALTER TABLE users ${col}`);
      console.log(`Success: ${col}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`Column already exists, skipping: ${col}`);
      } else {
        console.error(`Error adding column:`, err.message);
      }
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

runMigration();

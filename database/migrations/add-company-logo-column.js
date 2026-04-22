/**
 * Migration: Add company_logo column to jobs table
 */
const { query } = require('../../config/db');

async function migrate() {
  try {
    console.log('🚀 Starting migration: Add company_logo to jobs table...\n');

    // Check if column already exists
    const checkColumn = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'jobs' 
      AND COLUMN_NAME = 'company_logo'
    `;
    
    const existingColumn = await query(checkColumn);
    
    if (existingColumn.length > 0) {
      console.log('✅ Column company_logo already exists in jobs table');
      console.log('🎉 Migration completed!\n');
      return;
    }

    // Add company_logo column
    const addColumn = `
      ALTER TABLE jobs 
      ADD COLUMN company_logo VARCHAR(255) DEFAULT NULL AFTER hr_id
    `;
    
    await query(addColumn);
    console.log('✅ Added company_logo column to jobs table');

    console.log('\n🎉 Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrate().then(() => {
    console.log('Migration script finished');
    process.exit(0);
  }).catch(error => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
}

module.exports = migrate;

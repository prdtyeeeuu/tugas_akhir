const db = require('./config/db');

async function migrate() {
  try {
    const tableInfo = await db.query('DESCRIBE users');
    console.log("Current schema:");
    console.log(tableInfo.map(c => c.Field).join(', '));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
migrate();

const db = require('./config/db');
db.query('SELECT phone FROM users LIMIT 1')
  .then(r => console.log('OK'))
  .catch(e => console.log('ERROR', e.message))
  .finally(() => process.exit(0));

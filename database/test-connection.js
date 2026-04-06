// Test MySQL Connection
const mysql = require('mysql2');

console.log('Testing MySQL connection...\n');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'root'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    console.error('Error number:', err.errno);
    
    if (err.code === 'ECONNREFUSED') {
      console.log('\n💡 MySQL is not running. Please start MAMP MySQL server.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Wrong password. Please check your MySQL root password.');
    }
    process.exit(1);
  }
  
  console.log('✅ Connected to MySQL successfully!');
  
  connection.query('SELECT 1 + 1 AS result', (err, results) => {
    if (err) {
      console.error('Query error:', err.message);
    } else {
      console.log('✅ Query successful. Result:', results[0].result);
    }
    connection.end();
  });
});

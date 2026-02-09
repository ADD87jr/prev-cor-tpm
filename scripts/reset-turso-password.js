const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const newPassword = 'Admin2026!';
const hash = bcrypt.hashSync(newPassword, 10);

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

c.execute({
  sql: 'UPDATE User SET password = ? WHERE email = ?',
  args: [hash, 'office.prevcortpm@gmail.com']
}).then(r => {
  console.log('Password reset! Rows affected:', r.rowsAffected);
  console.log('Email: office.prevcortpm@gmail.com');
  console.log('New password: Admin2026!');
}).catch(e => console.error('Error:', e));

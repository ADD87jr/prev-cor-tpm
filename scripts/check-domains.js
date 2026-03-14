require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

db.execute("SELECT value FROM SiteSettings WHERE key = 'product_domains'")
  .then(r => {
    if (r.rows[0]?.value) {
      const domains = JSON.parse(r.rows[0].value);
      console.log('Domenii salvate:', domains.map(d => d.name));
    } else {
      console.log('Nu există domenii salvate');
    }
  });

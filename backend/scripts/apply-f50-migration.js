require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

(async () => {
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'prisma',
      'migrations',
      '20261016180000_feedback_50_loose_paddy_bags',
      'migration.sql',
    ),
    'utf8',
  );
  await c.connect();
  await c.query(sql);
  console.log('F50 Loose Paddy Bags migration OK');
  await c.end();
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

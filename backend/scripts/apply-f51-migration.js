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
      '20261016200000_feedback_51_wastage_record',
      'migration.sql',
    ),
    'utf8',
  );
  await c.connect();
  await c.query(sql);
  console.log('F51 Wastage Record migration OK');
  await c.end();
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

/**
 * Feedback 47 — apply Stack/Hoodi weight schema (idempotent).
 * Run: node scripts/apply-f47-migration.js
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

(async () => {
  const sqlPath = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    '20261001120000_feedback_47_stack_hoodi_weight',
    'migration.sql',
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await c.connect();
  await c.query(sql);
  console.log('F47 migration applied OK');

  const plantCol = await c.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.columns
     WHERE table_name='Plant' AND column_name='allowManualDateTimeStackTransfer'`,
  );
  const hoodi = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='HoodiRecord' AND column_name IN ('grossWeight','tareWeight','truckNo')
     ORDER BY 1`,
  );
  const dryer = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='DryerBharaiToStack' AND column_name IN ('grossWeight','tareWeight','truckNo')
     ORDER BY 1`,
  );
  console.log('Plant.allowManualDateTimeStackTransfer', plantCol.rows[0].n ? 'OK' : 'MISSING');
  console.log('HoodiRecord', hoodi.rows.map((r) => r.column_name).join(',') || 'MISSING');
  console.log('DryerBharaiToStack', dryer.rows.map((r) => r.column_name).join(',') || 'MISSING');
  await c.end();
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

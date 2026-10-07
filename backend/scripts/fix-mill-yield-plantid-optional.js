/**
 * Fix RDP prisma push warning: MillYieldBenchmark.plantId required → data reset.
 * Makes plantId nullable in DB (schema optional) while app still requires it.
 *
 *   node scripts/fix-mill-yield-plantid-optional.js
 */
require('dotenv').config();
const { Client } = require('pg');

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

(async () => {
  await c.connect();
  await c.query(`ALTER TABLE "MillYieldBenchmark" ADD COLUMN IF NOT EXISTS "plantId" TEXT`);
  await c.query(`ALTER TABLE "MillYieldBenchmark" ALTER COLUMN "plantId" DROP NOT NULL`);
  console.log('MillYieldBenchmark.plantId is now NULLABLE (optional in DB, required in API)');

  const r = await c.query(`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_name='MillYieldBenchmark' AND column_name='plantId'
  `);
  console.log('is_nullable =', r.rows[0]?.is_nullable);
  await c.end();
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

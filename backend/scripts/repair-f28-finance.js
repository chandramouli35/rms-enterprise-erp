/**
 * Feedback 28 DB repair:
 * - Add GatePass.financeSodaNA if missing
 * - Backfill FinanceSodaMill for sodas that have zero mill links
 *
 * Run: node scripts/repair-f28-finance.js
 */
require('dotenv').config();
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

(async () => {
  await c.connect();
  await c.query('BEGIN');

  await c.query(`
    ALTER TABLE "GatePass"
      ADD COLUMN IF NOT EXISTS "financeSodaNA" BOOLEAN NOT NULL DEFAULT false
  `);
  console.log('GatePass.financeSodaNA ensured');

  const plants = await c.query(
    `SELECT id, name FROM "Plant" WHERE "deletedAt" IS NULL ORDER BY name`,
  );
  if (!plants.rows.length) {
    throw new Error('No plants found — cannot backfill soda mills');
  }

  const orphans = await c.query(`
    SELECT s.id, s."sodaType", s."sodaNumber"
    FROM "FinanceSoda" s
    WHERE NOT EXISTS (
      SELECT 1 FROM "FinanceSodaMill" m WHERE m."sodaId" = s.id
    )
  `);
  console.log(`Orphan sodas (no mills): ${orphans.rows.length}`);

  // Assign every plant for multi-mill visibility of legacy rows,
  // or single plant if only one exists.
  for (const soda of orphans.rows) {
    for (const plant of plants.rows) {
      await c.query(
        `INSERT INTO "FinanceSodaMill" (id, "sodaId", "plantId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("sodaId", "plantId") DO NOTHING`,
        [randomUUID(), soda.id, plant.id],
      );
    }
    console.log(
      `  linked ${soda.sodaType}-${soda.sodaNumber} → ${plants.rows.map((p) => p.name).join(', ')}`,
    );
  }

  await c.query('COMMIT');

  const check = await c.query(`
    SELECT s."sodaType", s."sodaNumber",
           (SELECT COUNT(*)::int FROM "FinanceSodaMill" m WHERE m."sodaId"=s.id) AS mills
    FROM "FinanceSoda" s
    ORDER BY s."sodaType", s."sodaNumber"
  `);
  console.log('Soda mill counts:', check.rows);

  await c.end();
})().catch(async (e) => {
  console.error(e);
  try {
    await c.query('ROLLBACK');
  } catch {}
  await c.end().catch(() => {});
  process.exit(1);
});

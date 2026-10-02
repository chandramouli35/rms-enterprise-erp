/**
 * Make MillYieldBenchmark mill-wise (per plant).
 * Run: node scripts/migrate-mill-yield-plantwise.js
 */
require('dotenv').config();
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

const DEFAULTS = [
  { itemKey: 'PADDY', itemLabel: 'Paddy', requiredQty: 95817, yieldPctPaddy: 0, yieldPctRice: 0, roundFigRicePct: 0, sortOrder: 1, isActive: true },
  { itemKey: 'NET_RICE', itemLabel: 'Net rice', requiredQty: 63430.854, yieldPctPaddy: 66.2, yieldPctRice: 100, roundFigRicePct: 100, sortOrder: 2, isActive: true },
  { itemKey: 'KANI', itemLabel: 'kani', requiredQty: 2874.51, yieldPctPaddy: 3, yieldPctRice: 4.531722054, roundFigRicePct: 4.53, sortOrder: 3, isActive: true },
  { itemKey: 'NAKKU', itemLabel: 'nakku', requiredQty: 766.536, yieldPctPaddy: 0.8, yieldPctRice: 1.208459215, roundFigRicePct: 1.2, sortOrder: 4, isActive: true },
  { itemKey: 'REJECTION', itemLabel: 'Rejection', requiredQty: 958.17, yieldPctPaddy: 1, yieldPctRice: 1.510574018, roundFigRicePct: 1.5, sortOrder: 5, isActive: true },
  { itemKey: 'BRAN', itemLabel: 'Bran', requiredQty: 8144.445, yieldPctPaddy: 8.5, yieldPctRice: 12.83987915, roundFigRicePct: 12.8, sortOrder: 6, isActive: true },
  { itemKey: 'K_PHUCK', itemLabel: 'K.Phuck', requiredQty: 2395.425, yieldPctPaddy: 2.5, yieldPctRice: 3.776435045, roundFigRicePct: 3.7, sortOrder: 7, isActive: true },
  { itemKey: 'HUSK', itemLabel: 'Husk', requiredQty: 15809.805, yieldPctPaddy: 16.5, yieldPctRice: 24.9244713, roundFigRicePct: 24.92, sortOrder: 8, isActive: true },
  { itemKey: 'PURCHASED_RICE', itemLabel: 'Purchased Rice', requiredQty: 3832.68, yieldPctPaddy: 4, yieldPctRice: 6.042296073, roundFigRicePct: 6, sortOrder: 9, isActive: true },
  { itemKey: 'TARGETS', itemLabel: 'Yield Targets', requiredQty: 0, yieldPctPaddy: 71, yieldPctRice: 66.2, roundFigRicePct: 0, sortOrder: 99, isActive: false },
];

(async () => {
  await client.connect();
  await client.query('BEGIN');

  // 1) Ensure plantId column
  await client.query(`ALTER TABLE "MillYieldBenchmark" ADD COLUMN IF NOT EXISTS "plantId" TEXT`);

  // 2) Drop old unique on itemKey if present
  await client.query(`DROP INDEX IF EXISTS "MillYieldBenchmark_itemKey_key"`);

  const plants = await client.query(`SELECT id, name FROM "Plant" WHERE "deletedAt" IS NULL`);
  console.log(`Plants: ${plants.rows.length}`);

  // 3) Snapshot current global/legacy rows (prefer rows without plantId, else any)
  const legacy = await client.query(
    `SELECT DISTINCT ON ("itemKey")
       "itemKey","itemLabel","requiredQty","yieldPctPaddy","yieldPctRice","roundFigRicePct","sortOrder","isActive"
     FROM "MillYieldBenchmark"
     ORDER BY "itemKey", ("plantId" IS NOT NULL), "updatedAt" DESC`,
  );
  const template = legacy.rows.length ? legacy.rows : DEFAULTS;
  console.log(`Template rows: ${template.length}`);

  // 4) Wipe and re-seed mill-wise (keeps values from legacy template)
  await client.query(`DELETE FROM "MillYieldBenchmark"`);

  for (const plant of plants.rows) {
    for (const b of template) {
      const def = DEFAULTS.find((d) => d.itemKey === b.itemKey);
      await client.query(
        `INSERT INTO "MillYieldBenchmark"
          ("id","plantId","itemKey","itemLabel","requiredQty","yieldPctPaddy","yieldPctRice","roundFigRicePct","sortOrder","isActive","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [
          randomUUID(),
          plant.id,
          b.itemKey,
          b.itemLabel || def?.itemLabel || b.itemKey,
          b.requiredQty ?? def?.requiredQty ?? 0,
          b.yieldPctPaddy ?? def?.yieldPctPaddy ?? 0,
          b.yieldPctRice ?? def?.yieldPctRice ?? 0,
          b.roundFigRicePct ?? def?.roundFigRicePct ?? 0,
          b.sortOrder ?? def?.sortOrder ?? 0,
          b.isActive ?? def?.isActive ?? true,
        ],
      );
    }
    // Ensure TARGETS exists even if legacy lacked it
    const hasTargets = template.some((t) => t.itemKey === 'TARGETS');
    if (!hasTargets) {
      const t = DEFAULTS.find((d) => d.itemKey === 'TARGETS');
      await client.query(
        `INSERT INTO "MillYieldBenchmark"
          ("id","plantId","itemKey","itemLabel","requiredQty","yieldPctPaddy","yieldPctRice","roundFigRicePct","sortOrder","isActive","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [randomUUID(), plant.id, t.itemKey, t.itemLabel, t.requiredQty, t.yieldPctPaddy, t.yieldPctRice, t.roundFigRicePct, t.sortOrder, t.isActive],
      );
    }
    console.log(`  seeded ${plant.name}`);
  }

  // 5) Constraints
  await client.query(`ALTER TABLE "MillYieldBenchmark" ALTER COLUMN "plantId" SET NOT NULL`);
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "MillYieldBenchmark_plantId_itemKey_key" ON "MillYieldBenchmark"("plantId","itemKey")`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS "MillYieldBenchmark_plantId_idx" ON "MillYieldBenchmark"("plantId")`,
  );

  // Drop old FK if any, then add
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE "MillYieldBenchmark"
        DROP CONSTRAINT IF EXISTS "MillYieldBenchmark_plantId_fkey";
      ALTER TABLE "MillYieldBenchmark"
        ADD CONSTRAINT "MillYieldBenchmark_plantId_fkey"
        FOREIGN KEY ("plantId") REFERENCES "Plant"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END $$;
  `);

  await client.query('COMMIT');
  const count = await client.query(`SELECT "plantId", COUNT(*)::int AS n FROM "MillYieldBenchmark" GROUP BY "plantId"`);
  console.log('Done:', count.rows);
  await client.end();
})().catch(async (e) => {
  console.error(e);
  try {
    await client.query('ROLLBACK');
  } catch {}
  await client.end().catch(() => {});
  process.exit(1);
});

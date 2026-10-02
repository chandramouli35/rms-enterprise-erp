/**
 * Feedback 28 DB audit — FinanceSoda mill links + GatePass F28 columns.
 * Usage: node scripts/audit-f28-db.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const millDist = await client.query(`
    SELECT mills, COUNT(*)::int AS sodas
    FROM (
      SELECT s.id,
             (SELECT COUNT(*)::int FROM "FinanceSodaMill" m WHERE m."sodaId" = s.id) AS mills
      FROM "FinanceSoda" s
    ) t
    GROUP BY mills
    ORDER BY mills
  `);

  const zeroMills = await client.query(`
    SELECT COUNT(*)::int AS cnt
    FROM "FinanceSoda" s
    WHERE NOT EXISTS (
      SELECT 1 FROM "FinanceSodaMill" m WHERE m."sodaId" = s.id
    )
  `);

  const gpCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'GatePass'
      AND column_name IN (
        'financeSodaId', 'financeSodaNA', 'billNo', 'billNoNA', 'bagTypeGp'
      )
    ORDER BY column_name
  `);

  const gpStats = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT("financeSodaId")::int AS with_soda,
      COUNT(*) FILTER (WHERE "financeSodaNA" = true)::int AS soda_na,
      COUNT(*) FILTER (WHERE "billNoNA" = true)::int AS bill_na,
      COUNT(*) FILTER (WHERE "billNo" IS NOT NULL AND TRIM("billNo") <> '')::int AS with_bill,
      COUNT(*) FILTER (WHERE "bagTypeGp" IS NOT NULL)::int AS with_bag
    FROM "GatePass"
  `);

  const sodaTotals = await client.query(`
    SELECT COUNT(*)::int AS total_sodas,
           COUNT(*) FILTER (WHERE "isShift" = true)::int AS shift_sodas,
           COUNT(*) FILTER (WHERE "mirrorSodaId" IS NOT NULL)::int AS mirrored
    FROM "FinanceSoda"
  `);

  console.log(JSON.stringify({
    financeSodaMillDistribution: millDist.rows,
    sodasWithZeroMills: zeroMills.rows[0].cnt,
    gatePassF28Columns: gpCols.rows,
    gatePassStats: gpStats.rows[0],
    sodaTotals: sodaTotals.rows[0],
  }, null, 2));

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

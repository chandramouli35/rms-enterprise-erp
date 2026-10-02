require('dotenv').config();
const { Client } = require('pg');

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

(async () => {
  await c.connect();
  await c.query(`ALTER TABLE "FinanceParty" ADD COLUMN IF NOT EXISTS "notes" TEXT`);
  const r = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='FinanceParty' ORDER BY 1`,
  );
  console.log('FinanceParty cols:', r.rows.map((x) => x.column_name).join(', '));

  // Quick integrity: orphan soda mills / lines
  const mills = await c.query(`SELECT COUNT(*)::int AS n FROM "FinanceSodaMill"`);
  const sodas = await c.query(`SELECT COUNT(*)::int AS n FROM "FinanceSoda"`);
  const lines = await c.query(`SELECT COUNT(*)::int AS n FROM "FinanceSalePurchaseLine"`);
  const gps = await c.query(
    `SELECT COUNT(*)::int AS n FROM "GatePass" WHERE "financeSodaId" IS NOT NULL AND "isDraft"=false`,
  );
  const orphans = await c.query(`
    SELECT COUNT(*)::int AS n FROM "FinanceSoda" s
    WHERE NOT EXISTS (SELECT 1 FROM "FinanceSodaMill" m WHERE m."sodaId"=s.id)
  `);
  console.log({
    sodas: sodas.rows[0].n,
    mills: mills.rows[0].n,
    orphanSodasNoMills: orphans.rows[0].n,
    reportLines: lines.rows[0].n,
    nonDraftGpsWithSoda: gps.rows[0].n,
  });
  await c.end();
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

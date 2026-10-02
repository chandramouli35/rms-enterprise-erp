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
    '20260930200000_feedback_28_29_finance_core',
    'migration.sql',
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await c.connect();
  await c.query(sql);
  console.log('Migration applied OK');

  const tables = [
    'FinanceParty',
    'FinanceSoda',
    'FinanceSodaMill',
    'FinanceSalePurchaseLine',
    'FinancePaymentStatusAudit',
    'FinanceLedgerEntry',
  ];
  for (const t of tables) {
    const r = await c.query(
      `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [t],
    );
    console.log(t, r.rows[0].n ? 'OK' : 'MISSING');
  }
  const cols = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='GatePass' AND column_name IN ('financeSodaId','financeSodaNA','billNo','billNoNA','bagTypeGp')
     ORDER BY 1`,
  );
  console.log(
    'GP cols',
    cols.rows.map((x) => x.column_name),
  );
  await c.end();
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

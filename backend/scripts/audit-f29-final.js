require('dotenv').config();
const { Client } = require('pg');

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

function oil(o) {
  const A = o - 1;
  return A > 15 ? (A - 15) / 2 + 15 : A;
}
function round3(n) {
  return Math.round(n * 1000) / 1000;
}

(async () => {
  const results = [];
  const pass = (id, ok, detail) => results.push({ id, ok: !!ok, detail: detail || '' });

  // Formula unit checks from PDF
  pass('P-TC1', oil(18.5) === 16.25, `got ${oil(18.5)}`);
  pass('P-TC2', oil(14) === 13, `PDF typo 19→13; got ${oil(14)}`);
  pass('N-plastic', round3(500 * 0.002) === 1, '');
  pass('N-jute', round3(500 * 0.01) === 5, '');
  pass('S-case1', Math.min(500, 495) === 495, '');
  pass('T-case1', 500 - 495 === 5, '');
  pass('T-case2', 480 - 485 === -5, '');
  pass('U-case1', round3(500 / 1000) === 0.5, '');
  pass('U-case2', round3(480 / 800) === 0.6, '');
  const rateV = round3(16.25 * 40);
  const bill = round3(rateV * 495);
  const net = round3(bill - bill * (1.5 / 100));
  pass('V-bran', rateV === 650, '');
  pass('W', bill === 321750, '');
  pass('Y', net === 316923.75, '');

  await c.connect();

  const gpCols = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='GatePass'
       AND column_name IN ('financeSodaId','financeSodaNA','billNo','billNoNA','bagTypeGp','ntWtParty','netWeight','isDraft')
     ORDER BY 1`,
  );
  const gpSet = new Set(gpCols.rows.map((r) => r.column_name));
  for (const col of [
    'financeSodaId',
    'financeSodaNA',
    'billNo',
    'billNoNA',
    'bagTypeGp',
    'ntWtParty',
    'netWeight',
    'isDraft',
  ]) {
    pass(`DB-GP.${col}`, gpSet.has(col), '');
  }

  for (const t of [
    'FinanceParty',
    'FinanceSoda',
    'FinanceSodaMill',
    'FinanceSalePurchaseLine',
    'FinancePaymentStatusAudit',
    'FinanceLedgerEntry',
  ]) {
    const r = await c.query(
      `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [t],
    );
    pass(`DB-table.${t}`, r.rows[0].n === 1, '');
  }

  const notes = await c.query(
    `SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name='FinanceParty' AND column_name='notes'`,
  );
  pass('DB-FinanceParty.notes', notes.rows[0].n === 1, '');

  const fks = await c.query(
    `SELECT kcu.column_name, ccu.table_name AS ft
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
     WHERE tc.table_name='FinanceSalePurchaseLine' AND tc.constraint_type='FOREIGN KEY'`,
  );
  const fkMap = Object.fromEntries(fks.rows.map((r) => [r.column_name, r.ft]));
  pass('FK.financeSodaId', fkMap.financeSodaId === 'FinanceSoda', JSON.stringify(fkMap));
  pass('FK.gatePassId', fkMap.gatePassId === 'GatePass', '');
  pass('FK.plantId', fkMap.plantId === 'Plant', '');

  const uniq = await c.query(
    `SELECT indexname FROM pg_indexes WHERE tablename='FinanceSalePurchaseLine'`,
  );
  const idx = uniq.rows.map((r) => r.indexname).join(' ');
  pass('IDX.gatePass unique', /gatePassId/i.test(idx), idx);
  pass('IDX.soda+serial unique', /financeSodaId_serialNo|serialNo/i.test(idx), idx);

  const orphans = await c.query(`
    SELECT COUNT(*)::int AS n FROM "FinanceSoda" s
    WHERE NOT EXISTS (SELECT 1 FROM "FinanceSodaMill" m WHERE m."sodaId"=s.id)`);
  pass('DATA.no orphan sodas', orphans.rows[0].n === 0, `orphans=${orphans.rows[0].n}`);

  const draftLines = await c.query(`
    SELECT COUNT(*)::int AS n
    FROM "FinanceSalePurchaseLine" l
    JOIN "GatePass" g ON g.id = l."gatePassId"
    WHERE g."isDraft" = true`);
  pass('DATA.no draft report lines', draftLines.rows[0].n === 0, `n=${draftLines.rows[0].n}`);

  const counts = await c.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "FinanceSoda") AS sodas,
      (SELECT COUNT(*)::int FROM "FinanceSodaMill") AS mills,
      (SELECT COUNT(*)::int FROM "FinanceSalePurchaseLine") AS lines,
      (SELECT COUNT(*)::int FROM "GatePass" WHERE "financeSodaId" IS NOT NULL AND "isDraft"=false) AS gps`);
  pass(
    'DATA.counts',
    true,
    JSON.stringify(counts.rows[0]),
  );

  await c.end();

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log(`PASS ${passed.length} / FAIL ${failed.length} / TOTAL ${results.length}`);
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.id}${r.detail ? ' — ' + r.detail : ''}`);
  }
  if (failed.length) process.exit(1);
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

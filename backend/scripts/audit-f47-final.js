require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
});

const results = [];
const pass = (id, ok, detail) => results.push({ id, ok: !!ok, detail: detail || '' });

(async () => {
  await c.connect();
  const col = async (table, column) => {
    const r = await c.query(
      `SELECT COUNT(*)::int AS n FROM information_schema.columns
       WHERE table_name=$1 AND column_name=$2`,
      [table, column],
    );
    return r.rows[0].n === 1;
  };

  pass('DB.Plant.allowManualDateTimeStackTransfer', await col('Plant', 'allowManualDateTimeStackTransfer'));
  for (const t of ['HoodiRecord', 'DryerBharaiToStack']) {
    for (const cn of ['grossWeight', 'tareWeight', 'truckNo', 'netWeight']) {
      pass(`DB.${t}.${cn}`, await col(t, cn));
    }
  }
  await c.end();

  // Code file presence checks
  const root = path.join(__dirname, '..', '..');
  const reads = (rel, re) => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) return false;
    return re.test(fs.readFileSync(p, 'utf8'));
  };

  pass('UI.shared transfer form', reads('frontend/src/components/StackHoodiTransferForm.tsx', /Gross|pending|entryDate|netWeight/));
  pass('UI.StackToHoodi uses shared', reads('frontend/src/components/StackToHoodiTransfer.tsx', /stack_to_hoodi/));
  pass('UI.DryerBharai uses shared', reads('frontend/src/components/DryerBharaiToStackTransfer.tsx', /dryer_bharai_to_stack/));
  pass('UI.Gross Tare Net', reads('frontend/src/components/StackHoodiTransferForm.tsx', /grossWeight[\s\S]*tareWeight[\s\S]*netWeight/));
  pass('UI.pending WB select', reads('frontend/src/components/StackHoodiTransferForm.tsx', /Pending weighbridge/));
  pass('UI.realtime date lock', reads('frontend/src/components/StackHoodiTransferForm.tsx', /autoRealtime/));
  pass('UI.settings toggle', reads('frontend/src/pages/ProcurementManagement.tsx', /allowManualDateTimeStackTransfer/));
  pass('UI.part stack net weight', reads('frontend/src/pages/ProcurementManagement.tsx', /Net weight of Part Stack/));
  pass('UI.stack layout no 2467', !reads('frontend/src/components/StackLayoutView.tsx', /\b2467\b/));
  pass('UI.moisture continuous', reads('frontend/src/components/StackLayoutView.tsx', /moisture >= 16\.1/));
  pass('BE.gross-tare recompute', reads('backend/src/procurement/procurement.service.ts', /prefer Gross/));
  pass('BE.unloader includes transfers', reads('backend/src/procurement/procurement.service.ts', /hoodiTransfers[\s\S]*dryerTransfers/));
  pass('BE.unitaryWeight inward', reads('backend/src/procurement/procurement.service.ts', /unitaryWeight\(/));
  pass('BE.dryer stack-only', reads('backend/src/procurement/procurement.service.ts', /destination stack only|Dryer Bharai → Stack/));
  pass('MIG.f47 sql', fs.existsSync(path.join(root, 'backend/prisma/migrations/20261001120000_feedback_47_stack_hoodi_weight/migration.sql')));
  pass('MIG.rdp includes f47', reads('backend/scripts/migrate-rdp-latest.js', /apply-f47-migration/));

  // Soft gaps to report
  const paddyMapHas2467 = reads('frontend/src/components/PaddyStackMap.tsx', /\b2467\b/);
  pass('UI.PaddyStackMap no fixed 2467', !paddyMapHas2467, paddyMapHas2467 ? 'still has placeholder 2467' : '');

  const failed = results.filter((r) => !r.ok);
  console.log(`PASS ${results.length - failed.length} / FAIL ${failed.length} / TOTAL ${results.length}`);
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.id}${r.detail ? ' — ' + r.detail : ''}`);
  }
  if (failed.length) process.exit(1);
})().catch(async (e) => {
  console.error(e);
  await c.end().catch(() => {});
  process.exit(1);
});

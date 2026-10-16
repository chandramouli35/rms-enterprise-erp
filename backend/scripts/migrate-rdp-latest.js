/**
 * RDP / production: apply latest Feedback 28–29 + mill-yield schema (idempotent).
 * Run after deploy, before or with migrate_permissions.js
 *
 *   cd backend
 *   node scripts/migrate-rdp-latest.js
 *   npm run migrate:permissions
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const steps = [
  ['Mill yield plant-wise', 'migrate-mill-yield-plantwise.js'],
  ['F28 GatePass soda NA + mill backfill', 'repair-f28-finance.js'],
  ['F28/F29 finance core tables', 'apply-f29-migration.js'],
  ['F47 Stack/Hoodi weight + settings', 'apply-f47-migration.js'],
  ['F48 Manual Agency GP', 'apply-f48-migration.js'],
  ['F49 e-GP Late + 3rd part stack', 'apply-f49-migration.js'],
  ['F50 Loose paddy bags', 'apply-f50-migration.js'],
  ['F51 Safai Dust and Patal wastage', 'apply-f51-migration.js'],
  ['F53 Labour Work Order', 'apply-f53-migration.js'],
];

let failed = 0;
for (const [label, file] of steps) {
  console.log(`\n=== ${label} (${file}) ===`);
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`FAILED: ${file}`);
    failed += 1;
  }
}

console.log('\n=== Done ===');
if (failed) {
  console.error(`${failed} step(s) failed`);
  process.exit(1);
}
console.log('Schema OK. Next: npm run migrate:permissions');

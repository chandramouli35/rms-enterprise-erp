const { Client } = require('pg');
require('dotenv').config();

/**
 * Backfill ModulePermission rows from MODULE_STRUCTURE (Users → Roles / Permissions).
 *
 * RDP / production (from backend folder, with .env DB URL set):
 *   cd backend
 *   node migrate_permissions.js
 *
 * Or:
 *   npm run migrate:permissions
 *
 * Safe to re-run: only inserts missing rows, then applies default grants below.
 */

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: No database connection string found.');
  console.error(
    'Please set SUPABASE_DB_URL or DATABASE_URL in your .env file or environment variables.',
  );
  process.exit(1);
}

const client = new Client({ connectionString });

/** Keep in sync with users-roles.service.ts MODULE_STRUCTURE (no Milestone 4) */
const MODULE_STRUCTURE = [
  { name: 'Dashboard', subModules: [] },
  {
    name: 'Procurement',
    subModules: [
      'Supplier Master',
      'Mandi Master',
      'Boli Record',
      'Stack to Hoodi',
      'Dryer Bharai to Stack',
      'Paddy Inward',
      'Inward List',
      'Loader & Unloader',
      'Global Settings (Govt Rate)',
      'Reports',
      'Quality Inspection',
      'Purchase Register',
    ],
  },
  {
    name: 'Production',
    subModules: [
      'Batch Creation',
      'Production Tracking',
      'Daily Stock Report',
      'Shift-Wise Report',
      'Intermill History',
      'Compare Reports',
    ],
  },
  {
    name: 'Yield Mgmt',
    subModules: [
      'Mill Yield Benchmarks',
      'Yield from Rice',
      'Yield from Paddy',
      'Stock Health Report',
      'Consignment Dispatch',
      'Yield Calculator',
      'Yield Analytics',
      'Historical Reports',
    ],
  },
  {
    name: 'Inventory',
    subModules: [
      'Paddy Stock',
      'Rice Stock',
      'Bran Stock',
      'Husk Stock',
      'Finished Goods',
      'Consumables Inventory',
    ],
  },
  { name: 'Transfer', subModules: ['Transfer Request', 'Transfer Tracking', 'In Transit Stock'] },
  { name: 'Weighbridge', subModules: ['Capture', 'History', 'Settings'] },
  {
    name: 'Gate Pass',
    subModules: [
      'Create Gate Pass',
      'Report Summary',
      'Transfer Entry Management',
      'QR Barcode',
      'Duplicate Prevention',
    ],
  },
  { name: 'Staff Management', subModules: ['Staff List', 'Add Staff', 'Truck Management'] },
  { name: 'Dryer Work', subModules: ['GOYAL AGRO', 'RAJOA AGRO', 'BEAS AGRO'] },
  { name: 'Users and Roles', subModules: ['Users', 'Roles', 'Permissions', 'Audit Access'] },
  { name: 'Products', subModules: [] },
  { name: 'Plants', subModules: [] },
  { name: 'Settings', subModules: ['Global Settings'] },
  {
    name: 'Finance',
    subModules: [
      'Master',
      'Deals / Soda Record',
      'Sale',
      'Purchase',
      'Junction Report',
      'Receivables',
      'Payables',
      'Payment Received',
      'Payment Paid',
    ],
  },
  {
    name: 'Expenses',
    subModules: ['Add Funds', 'Expenses', 'Petty Cashbook', 'COGS'],
  },
  {
    name: 'Trucks & Diesel',
    subModules: ['Add Fuel', 'Truck Average', 'Pump wise details'],
  },
  {
    name: 'CMS',
    subModules: [
      'Real-time Paddy Inward (Notified)',
      'Boli Record with Pending Boli Also',
      'Real-time GP Entry Tracking (Notified)',
      'Paddy Stock',
      'Production Tracking',
      'Live Stock Ledger',
      'Yield Analysis',
      'Alerts on Abnormal Transactions',
      'Real-time Basis Tracking',
      'CMS User Permission Controls',
      'Full Traceability',
      'Plant-Wise Comparison',
      'Manual Correction Alerts',
      'Overprice Detection',
      'Weighment Pattern Monitoring',
      'Correction Audit Control',
      'Audit Logs Tracking',
      'Transaction Severity Categories',
      'Stock Available for Dispatch',
      'Receivables Tracking',
      'Paddy Cost Tracking',
    ],
  },
];

/**
 * After backfill, turn on these modules for operational roles
 * (new modules start as false for non–Super Admin).
 * Adjust roleNames if RDP role names differ.
 */
const DEFAULT_GRANTS = [
  {
    moduleName: 'Trucks & Diesel',
    roleNames: ['PLANT_MANAGER', 'SUPERVISOR'],
    flags: { canView: true, canAdd: true, canEdit: true, canDelete: false, canApprove: false },
  },
  {
    moduleName: 'Expenses',
    roleNames: ['PLANT_MANAGER', 'SUPERVISOR', 'ACCOUNTANT'],
    flags: { canView: true, canAdd: true, canEdit: true, canDelete: false, canApprove: false },
  },
];

async function applyDefaultGrants() {
  console.log('\nApplying default grants for new modules…');
  for (const g of DEFAULT_GRANTS) {
    const roles = await client.query(
      'SELECT id, name FROM "Role" WHERE name = ANY($1)',
      [g.roleNames],
    );
    for (const role of roles.rows) {
      const u = await client.query(
        `UPDATE "ModulePermission"
         SET "canView" = $2,
             "canAdd" = $3,
             "canEdit" = $4,
             "canDelete" = $5,
             "canApprove" = $6,
             "updatedAt" = NOW()
         WHERE "roleId" = $1 AND "moduleName" = $7`,
        [
          role.id,
          g.flags.canView,
          g.flags.canAdd,
          g.flags.canEdit,
          g.flags.canDelete,
          g.flags.canApprove,
          g.moduleName,
        ],
      );
      console.log(`  ${role.name} → ${g.moduleName}: ${u.rowCount} rows`);
    }
    if (roles.rows.length === 0) {
      console.log(`  (no roles matched ${g.roleNames.join(', ')}) for ${g.moduleName}`);
    }
  }
}

async function main() {
  try {
    await client.connect();
    console.log(`Connected to database: ${connectionString.split('@')[1] || 'Local/Unknown'}`);
    console.log('Starting migration to backfill hierarchical submodule permissions…');

    const rolesRes = await client.query('SELECT id, name FROM "Role"');
    const roles = rolesRes.rows;

    console.log(`Found ${roles.length} roles to process.`);

    for (const role of roles) {
      console.log(`\nProcessing Role: ${role.name}`);

      for (const mod of MODULE_STRUCTURE) {
        const parentExists = await client.query(
          `SELECT id FROM "ModulePermission" WHERE "roleId" = $1 AND "moduleName" = $2 AND ("subModuleName" IS NULL OR "subModuleName" = '')`,
          [role.id, mod.name],
        );
        if (parentExists.rows.length === 0) {
          await client.query(
            `INSERT INTO "ModulePermission" ("id", "roleId", "moduleName", "subModuleName", "canView", "canAdd", "canEdit", "canDelete", "canApprove", "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, '', $3, $3, $3, $3, false, NOW(), NOW())`,
            [role.id, mod.name, role.name === 'SUPER_ADMIN'],
          );
          console.log(`  + parent ${mod.name}`);
        }

        for (const sub of mod.subModules) {
          const subExists = await client.query(
            `SELECT id FROM "ModulePermission" WHERE "roleId" = $1 AND "moduleName" = $2 AND "subModuleName" = $3`,
            [role.id, mod.name, sub],
          );
          if (subExists.rows.length === 0) {
            const parentFlags = await client.query(
              `SELECT "canView","canAdd","canEdit","canDelete","canApprove" FROM "ModulePermission"
               WHERE "roleId" = $1 AND "moduleName" = $2 AND ("subModuleName" IS NULL OR "subModuleName" = '')`,
              [role.id, mod.name],
            );
            const p = parentFlags.rows[0];
            const grant = p
              ? [p.canView, p.canAdd, p.canEdit, p.canDelete, p.canApprove]
              : [
                  role.name === 'SUPER_ADMIN',
                  role.name === 'SUPER_ADMIN',
                  role.name === 'SUPER_ADMIN',
                  role.name === 'SUPER_ADMIN',
                  false,
                ];
            await client.query(
              `INSERT INTO "ModulePermission" ("id", "roleId", "moduleName", "subModuleName", "canView", "canAdd", "canEdit", "canDelete", "canApprove", "createdAt", "updatedAt")
               VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
              [role.id, mod.name, sub, ...grant],
            );
            console.log(`  + ${mod.name} / ${sub}`);
          }
        }
      }
    }

    await applyDefaultGrants();

    console.log('\nDone. Open Users → Roles / Permissions to review. Users should re-login.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

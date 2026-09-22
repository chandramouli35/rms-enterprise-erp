const { Client } = require('pg');
require('dotenv').config();

// Ensure the connection string is provided either directly or via .env
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: No database connection string found.");
  console.error("Please set SUPABASE_DB_URL or DATABASE_URL in your .env file or environment variables.");
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
];

async function main() {
  try {
    await client.connect();
    console.log(`Connected to database: ${connectionString.split('@')[1] || 'Local/Unknown'}`);
    console.log('Starting migration to backfill hierarchical submodule permissions in the database...');

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
            // Inherit parent module flags when present; else Super Admin only
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

    console.log('\nDone. Open users?tab=Permissions and review/save each role.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

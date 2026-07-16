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

const MODULE_STRUCTURE = [
  { name: 'Procurement', subModules: ['Supplier Master', 'Paddy Purchase & Quality', 'Paddy Inward', 'Inward List', 'Quality Inspection', 'Purchase Register'] },
  { name: 'Production', subModules: ['Batch Creation', 'Production Tracking'] },
  { name: 'Inventory', subModules: ['Paddy Stock', 'Rice Stock', 'Bran Stock', 'Husk Stock', 'Finished Goods', 'Consumables Inventory'] },
  { name: 'Yield Mgmt', subModules: ['Yield Calculator', 'Yield Analytics', 'Historical Reports'] },
  { name: 'Transfer', subModules: ['Transfer Request', 'Transfer Tracking', 'In Transit Stock'] },
  { name: 'Weighbridge', subModules: ['Capture', 'History', 'Settings'] },
  { name: 'Gate Pass', subModules: ['Gate In', 'Gate Out', 'Report Summary', 'QR Barcode', 'Duplicate Prevention'] },
  { name: 'Users and Roles', subModules: ['Users', 'Roles', 'Permissions', 'Audit Access'] },
  { name: 'Settings', subModules: ['Global Settings'] }
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
      
      // Fetch current permissions for this role
      const permsRes = await client.query('SELECT * FROM "ModulePermission" WHERE "roleId" = $1', [role.id]);
      const perms = permsRes.rows;
      
      for (const mod of MODULE_STRUCTURE) {
        // Find parent permission
        const parentPerm = perms.find(p => p.moduleName === mod.name && (!p.subModuleName || p.subModuleName === ''));
        
        if (!parentPerm) {
          continue;
        }
        
        console.log(`- Found parent access for ${mod.name}. Backfilling submodules...`);
        
        for (const sub of mod.subModules) {
          const subPermExists = perms.some(p => p.moduleName === mod.name && p.subModuleName === sub);
          
          if (!subPermExists) {
            await client.query(
              'INSERT INTO "ModulePermission" ("id", "roleId", "moduleName", "subModuleName", "canView", "canAdd", "canEdit", "canDelete", "canApprove", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) ON CONFLICT DO NOTHING',
              [role.id, mod.name, sub, parentPerm.canView, parentPerm.canAdd, parentPerm.canEdit, parentPerm.canDelete, parentPerm.canApprove]
            );
            console.log(`   + Created submodule: ${sub} (Inherited parent perms)`);
          }
        }
      }
    }
    
    console.log('\nMigration complete! All roles in the database now have fully dynamic hierarchical submodule rows.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

main();

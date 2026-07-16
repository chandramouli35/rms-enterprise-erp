const { Client } = require('pg');
require('dotenv').config();

// Ensure the connection string is provided either directly or via .env
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: No database connection string found.");
  console.error("Please set DATABASE_URL in your .env file.");
  process.exit(1);
}

const client = new Client({ connectionString });

async function main() {
  try {
    await client.connect();
    console.log(`Connected to database: ${connectionString.split('@')[1] || 'Local/Unknown'}`);
    
    // 1. Rename "Batch Summary" to "Production Tracking" in the DB to fix the missing tab
    console.log('\nFixing "Batch Summary" name mismatch...');
    const renameRes = await client.query(`
      UPDATE "ModulePermission" 
      SET "subModuleName" = 'Production Tracking' 
      WHERE "subModuleName" = 'Batch Summary'
    `);
    console.log(`✓ Renamed ${renameRes.rowCount} records to "Production Tracking".`);

    // 2. Give SUPER_ADMIN all permissions by default
    console.log('\nGranting ALL permissions to SUPER_ADMIN...');
    
    // First, find the SUPER_ADMIN role ID
    const roleRes = await client.query(`SELECT id FROM "Role" WHERE name = 'SUPER_ADMIN' LIMIT 1`);
    if (roleRes.rows.length === 0) {
      console.log('⚠ SUPER_ADMIN role not found in the database!');
    } else {
      const superAdminId = roleRes.rows[0].id;
      
      const updateRes = await client.query(`
        UPDATE "ModulePermission" 
        SET "canView" = true, 
            "canAdd" = true, 
            "canEdit" = true, 
            "canDelete" = true, 
            "canApprove" = true 
        WHERE "roleId" = $1
      `, [superAdminId]);
      
      console.log(`✓ Granted full access to ${updateRes.rowCount} permission records for SUPER_ADMIN.`);
    }

    console.log('\nProduction DB successfully fixed!');
  } catch (error) {
    console.error('Operation failed:', error);
  } finally {
    await client.end();
  }
}

main();

const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Chandra@123@localhost:5432/rms?schema=public' });

async function main() {
  await client.connect();
  const roleRes = await client.query('SELECT id FROM "Role" WHERE name = $1', ['TEST']);
  if (roleRes.rows.length) {
    const roleId = roleRes.rows[0].id;
    // Insert Dashboard
    await client.query('INSERT INTO "ModulePermission" ("id", "roleId", "moduleName", "canView", "canAdd", "canEdit", "canDelete", "canApprove", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, true, false, false, false, false, NOW(), NOW()) ON CONFLICT DO NOTHING', [roleId, 'Dashboard']);
    // Insert Procurement
    await client.query('INSERT INTO "ModulePermission" ("id", "roleId", "moduleName", "canView", "canAdd", "canEdit", "canDelete", "canApprove", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, true, false, false, false, false, NOW(), NOW()) ON CONFLICT DO NOTHING', [roleId, 'Procurement']);
    console.log('Inserted Dashboard and Procurement permissions for TEST role');
  }
  await client.end();
}

main().catch(console.error);

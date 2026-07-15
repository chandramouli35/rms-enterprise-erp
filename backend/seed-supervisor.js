const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({ connectionString: 'postgresql://postgres:Chandra@123@localhost:5432/rms?schema=public' });

async function main() {
  await client.connect();
  console.log('Seeding Supervisor role and user...');

  // 1. Create or get Supervisor Role
  let roleRes = await client.query('SELECT id FROM "Role" WHERE name = $1', ['Supervisor']);
  let roleId;

  if (roleRes.rows.length === 0) {
    const insertRole = await client.query('INSERT INTO "Role" ("id", "name", "description", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id', ['Supervisor', 'Plant Supervisor with restricted production and procurement access']);
    roleId = insertRole.rows[0].id;
    console.log('Created Supervisor role:', roleId);
  } else {
    roleId = roleRes.rows[0].id;
    console.log('Supervisor role already exists:', roleId);
  }

  // 2. Add permissions for the Supervisor role
  const modules = ['Production', 'Procurement', 'Inventory', 'Weighbridge'];
  for (const mod of modules) {
    await client.query('INSERT INTO "ModulePermission" ("id", "roleId", "moduleName", "canView", "canAdd", "canEdit", "canDelete", "canApprove", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, true, true, true, false, false, NOW(), NOW()) ON CONFLICT DO NOTHING', [roleId, mod]);
    console.log(`Added permission for ${mod}`);
  }

  // 3. Create a test user
  const email = 'supervisor@rms.com';
  const userRes = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
  let userId;

  if (userRes.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('supervisor123', 10);
    const insertUser = await client.query('INSERT INTO "User" ("id", "username", "email", "passwordHash", "roleId", "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id', ['Supervisor User', email, hashedPassword, roleId, true]);
    userId = insertUser.rows[0].id;
    console.log('Created test supervisor user:', email);

    // Assign to a plant
    const plantRes = await client.query('SELECT id, name FROM "Plant" LIMIT 1');
    if (plantRes.rows.length > 0) {
      const plantId = plantRes.rows[0].id;
      await client.query('INSERT INTO "UserPlantAccess" ("userId", "plantId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, plantId]);
      console.log(`Assigned supervisor to plant ${plantRes.rows[0].name}`);
    }
  } else {
    console.log('Test supervisor user already exists');
    userId = userRes.rows[0].id;
    const plantRes = await client.query('SELECT id, name FROM "Plant" LIMIT 1');
    if (plantRes.rows.length > 0) {
      const plantId = plantRes.rows[0].id;
      await client.query('INSERT INTO "UserPlantAccess" ("userId", "plantId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, plantId]);
      console.log(`Assigned supervisor to plant ${plantRes.rows[0].name}`);
    }
  }

  await client.end();
}

main().catch(console.error);

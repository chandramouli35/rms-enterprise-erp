const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Chandra@123@localhost:5432/rms?schema=public' });

async function main() {
  await client.connect();
  const roleRes = await client.query('SELECT id FROM "Role" WHERE name = $1', ['TEST']);
  if (roleRes.rows.length) {
    const roleId = roleRes.rows[0].id;
    const perms = await client.query('SELECT * FROM "ModulePermission" WHERE "roleId" = $1', [roleId]);
    console.log(JSON.stringify(perms.rows, null, 2));
  }
  await client.end();
}

main().catch(console.error);

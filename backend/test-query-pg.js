const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Chandra@123@localhost:5432/rms?schema=public' });

async function main() {
  await client.connect();
  const roleRes = await client.query('SELECT * FROM "Role" WHERE name = $1', ['TEST']);
  if (roleRes.rows.length > 0) {
    const roleId = roleRes.rows[0].id;
    const permRes = await client.query('SELECT * FROM "ModulePermission" WHERE "roleId" = $1', [roleId]);
    console.log(JSON.stringify(permRes.rows, null, 2));
  } else {
    console.log("No TEST role found");
  }
  await client.end();
}

main().catch(console.error);

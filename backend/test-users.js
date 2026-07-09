const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Chandra@123@localhost:5432/rms?schema=public' });

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, username, email, "roleId" FROM "User" WHERE email = $1', ['cm@yopmail.com']);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);

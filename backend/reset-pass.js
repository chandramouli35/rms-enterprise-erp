const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({ connectionString: 'postgresql://postgres:Chandra@123@localhost:5432/rms?schema=public' });

async function main() {
  await client.connect();
  const hash = await bcrypt.hash('password123', 10);
  await client.query('UPDATE "User" SET "passwordHash" = $1 WHERE email = $2', [hash, 'cm@yopmail.com']);
  console.log('Password reset to password123');
  await client.end();
}

main().catch(console.error);

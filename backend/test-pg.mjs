import { Client } from 'pg';

async function test() {
  const client = new Client({
    connectionString: "postgresql://postgres:Chandra@123@localhost:5432/rms?schema=public"
  });
  await client.connect();
  const res = await client.query('SELECT * FROM "ProductionBatch"');
  console.log("Total Batches in DB:", res.rows.length);
  await client.end();
}
test().catch(console.error);

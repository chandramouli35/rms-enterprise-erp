const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const res = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
  console.log(res);
}
main().catch(console.error).finally(() => prisma.$disconnect());

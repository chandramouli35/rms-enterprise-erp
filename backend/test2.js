const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.dispatch.findMany();
  console.log('Total Dispatches:', d.length);
  console.log(d);
}
main().catch(console.error).finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.productionBatch.findMany();
  console.log("Batches:", batches.length);
  const reports = await prisma.yieldReport.findMany();
  console.log("Yield Reports:", reports.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());

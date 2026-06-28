const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plants = await prisma.plant.count();
  const inventory = await prisma.inventoryItem.count();
  const gatePasses = await prisma.gatePass.count();
  const procurements = await prisma.procurementBatch.count();

  console.log({
    plants,
    inventory,
    gatePasses,
    procurements
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

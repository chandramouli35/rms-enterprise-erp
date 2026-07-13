const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get first plant
  const plant = await prisma.plant.findFirst();
  if (!plant) {
    console.log("No plant found!");
    return;
  }

  // Create a batch
  const batch = await prisma.productionBatch.create({
    data: {
      plantId: plant.id,
      batchNo: 'TEST-BATCH-001',
      date: new Date(),
      shift: 'Day Shift',
      productionLine: 'Line 1',
      paddyType: 'Raw',
      variety: 'Sugandha',
      paddyUsedQty: 50,
      status: 'In Progress'
    }
  });

  console.log("Successfully created batch:", batch.batchNo);
}

main().catch(console.error).finally(() => prisma.$disconnect());

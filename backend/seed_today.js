const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plant = await prisma.plant.findFirst();
  if (!plant) return;

  const now = new Date();
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0] + 'T00:00:00.000Z';

  await prisma.productionBatch.create({
    data: {
      plantId: plant.id,
      productionState: 'PADDY_DRYING',
      batchNo: 'PD-' + Date.now(),
      date: new Date(d),
      shift: 'Day',
      productionLine: 'Line 1',
      paddyType: '1121',
      variety: 'Sella',
      paddyUsedQty: 100,
      riceProducedQty: 95
    }
  });

  await prisma.productionBatch.create({
    data: {
      plantId: plant.id,
      productionState: 'INTERMILL_PROCESSING',
      batchNo: 'IM-' + Date.now(),
      date: new Date(d),
      shift: 'Night',
      productionLine: 'Line 2',
      paddyType: 'Raw',
      variety: 'Raw',
      paddyUsedQty: 50,
      riceProducedQty: 48
    }
  });
  
  await prisma.productionBatch.create({
    data: {
      plantId: plant.id,
      productionState: 'PLANT_OFF',
      batchNo: 'OFF-' + Date.now(),
      date: new Date(d),
      shift: 'Day',
      productionLine: 'Line 1',
      paddyType: 'N/A',
      variety: 'N/A',
      paddyUsedQty: 0,
      riceProducedQty: 0
    }
  });

  // Let's also create one RICE_MILLING batch so the top table has data!
  await prisma.productionBatch.create({
    data: {
      plantId: plant.id,
      productionState: 'RICE_MILLING',
      batchNo: 'RM-' + Date.now(),
      date: new Date(d),
      shift: 'Day',
      productionLine: 'Line 1',
      paddyType: '1121',
      variety: 'Sella',
      paddyUsedQty: 1000,
      riceProducedQty: 662,
      rBranBags: 162,
      kPhuckBags: 47,
      nakku1Bags: 15,
      brokenRiceBags: 57,
      finalRiceBags: 662 * 20
    }
  });

  console.log('Dummy batches created successfully for today!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy test data for reports...');

  // 1. Get first active plant
  const plant = await prisma.plant.findFirst();
  if (!plant) {
    console.log('No plants found. Please create a plant first.');
    return;
  }
  const plantId = plant.id;
  console.log('Using plant:', plant.name);

  // Get or create a supplier
  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name: 'Test Supplier', location: 'Test Location' }
    });
  }

  // 2. STACK INWARD (Populates Stack Layout, Paddy Stack, Stack History)
  console.log('Creating Stack Inward...');
  const batch1 = await prisma.procurementBatch.create({
    data: {
      plantId,
      supplierId: supplier.id,
      status: 'COMPLETED',
      netWeight: 10000,
      netAmount: 50000,
      purchaseType: 'PADDY_MILLING',
      paddyInwardDetails: {
        create: {
          plantId,
          supplierId: supplier.id,
          truckNo: 'PB-10-XX-1111',
          allocationType: 'Stacking',
          stackNo: '99A',
          bags: 500,
          bagsType: 'A_Class',
          moisture: 18.5, // Will trigger Yellow color in layout
          unloadedBy: 'Team A',
          date: new Date()
        }
      }
    },
    include: { paddyInwardDetails: true }
  });

  // Upsert the PaddyStack just like the service does
  await prisma.paddyStack.upsert({
    where: { plantId_stackNo: { plantId, stackNo: '99A' } },
    update: {
      totalBags: { increment: 500 },
      totalWeight: { increment: 10000 },
      bagsAClass: { increment: 500 },
      averageMoisture: 18.5,
      isNewAClass: true,
      status: 'ACTIVE'
    },
    create: {
      plantId,
      stackNo: '99A',
      totalBags: 500,
      totalWeight: 10000,
      averageMoisture: 18.5,
      bagsAClass: 500,
      isNewAClass: true,
      status: 'ACTIVE'
    }
  });

  // 3. SHORTAGE INWARD (Populates Shortage Recovery)
  console.log('Creating Shortage Inward...');
  await prisma.procurementBatch.create({
    data: {
      plantId,
      supplierId: supplier.id,
      status: 'COMPLETED',
      netWeight: 8000,
      netAmount: 40000,
      purchaseType: 'PADDY_MILLING',
      paddyInwardDetails: {
        create: {
          plantId,
          supplierId: supplier.id,
          truckNo: 'PB-20-YY-2222',
          allocationType: 'Direct_Mill',
          bags: 400,
          shortageQtl: 2.5, // Total shortage 2.5 qtl
          shortageRecoveryQtl: 0.5, // Recovered 0.5 qtl
          shortageType: 'Weight',
          date: new Date()
        }
      }
    }
  });

  // 4. HOODI DIRECT INWARD (Populates Hoodi Report directly)
  console.log('Creating Direct Hoodi Inward...');
  const batch3 = await prisma.procurementBatch.create({
    data: {
      plantId,
      supplierId: supplier.id,
      status: 'COMPLETED',
      netWeight: 5000,
      netAmount: 25000,
      purchaseType: 'PADDY_MILLING',
      paddyInwardDetails: {
        create: {
          plantId,
          supplierId: supplier.id,
          truckNo: 'PB-30-ZZ-3333',
          allocationType: 'Hoodi',
          bags: 250,
          moisture: 17.5,
          unloadedBy: 'Team B',
          date: new Date()
        }
      }
    },
    include: { paddyInwardDetails: true }
  });

  await prisma.hoodiRecord.create({
    data: {
      plantId,
      sourceType: 'DIRECT_INWARD',
      truckNo: 'PB-30-ZZ-3333',
      supplierName: supplier.name,
      moisture: 17.5,
      bags: 250,
      unloadedBy: 'Team B',
      inwardId: batch3.id,
      date: new Date()
    }
  });

  // 5. STACK TRANSFER TO HOODI (Populates Hoodi Report & deductions)
  console.log('Creating Stack Transfer to Hoodi...');
  await prisma.hoodiRecord.create({
    data: {
      plantId,
      sourceType: 'STACK_TRANSFER',
      stackNo: '99A',
      bags: 100, // Transferring 100 bags from stack 99A
      moisture: 18.5,
      unloadedBy: 'Transfer Team',
      date: new Date()
    }
  });

  // Deduct from Stack
  await prisma.paddyStack.update({
    where: { plantId_stackNo: { plantId, stackNo: '99A' } },
    data: {
      totalBags: { decrement: 100 },
      bagsAClass: { decrement: 100 }
    }
  });

  console.log('Successfully seeded test data for all reports!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

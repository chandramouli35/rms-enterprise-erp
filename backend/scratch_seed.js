const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Find Beas Agro plant
  const plants = await prisma.plant.findMany();
  const beas = plants.find(p => p.name.toLowerCase().includes('beas agro'));
  
  if (!beas) {
    console.log('Beas Agro plant not found.');
    return;
  }

  console.log(`Found Beas Agro: ${beas.id}`);

  // Create or Update a PaddyStack for stack '24'
  const stack = await prisma.paddyStack.upsert({
    where: {
      plantId_stackNo: {
        plantId: beas.id,
        stackNo: '24'
      }
    },
    update: {
      status: 'ACTIVE',
      totalBags: 1200,
      totalWeight: 1200 * 50,
      averageMoisture: 18.2,
      isNewAClass: true
    },
    create: {
      plantId: beas.id,
      stackNo: '24',
      status: 'ACTIVE',
      totalBags: 1200,
      totalWeight: 1200 * 50,
      averageMoisture: 18.2,
      isNewAClass: true
    }
  });

  console.log(`Created Stack 24: ${stack.id}`);

  // Create a ProcurementBatch to represent an actively unloading truck
  const supplier = await prisma.supplier.findFirst();
  
  const batch = await prisma.procurementBatch.create({
    data: {
      plantId: beas.id,
      supplierId: supplier?.id,
      status: 'IN_PROGRESS',
      grossWeight: 25000,
      tareWeight: 10000,
      netWeight: 15000,
      quality: {
        create: {
          moisture: 18.2
        }
      },
      paddyInwardDetails: {
        create: {
          stackNo: '24',
          truckNo: 'PB08-XY-1234',
          bagsRecAtMill: 1200,
          unloaderName: 'System',
          bagsInSecondPartStack: 100,
          secondPartStackNo: '25'
        }
      }
    }
  });

  console.log(`Created Actively Unloading Truck for Stack 24`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));

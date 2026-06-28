import * as dotenv from 'dotenv';
import * as path from 'path';

// CRITICAL: Load .env variables explicitly before importing modules or services!
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  // Confirm the variable successfully resolved
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL variable is not defined inside your env file config path!');
    process.exit(1);
  }

  // Initialize NestJS application context to safely access injected services
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('🔍 Environment validated. Fetching existing plant contexts from your database...');
  const existingPlants = await prisma.plant.findMany();

  if (existingPlants.length === 0) {
    console.log('❌ No plants found! Please ensure your baseline plants are registered first.');
    await app.close();
    return;
  }

  const mainPlant = existingPlants.find(p => p.code === 'PLANT-HQ') || existingPlants[0];
  console.log(`🏭 Found ${existingPlants.length} plants. Directing heavy metric footprints to: ${mainPlant.name}`);

  console.log('🧼 Clearing old metric rows to prevent record duplication constraints...');
  await prisma.productionLog.deleteMany({});
  await prisma.millingProcess.deleteMany({});
  await prisma.procurementBatch.deleteMany({});
  await prisma.stockLedger.deleteMany({});
  await prisma.gatePass.deleteMany({});
  await prisma.inventory.deleteMany({});

  console.log('📦 Setting up high-density baseline Inventory matching the mockup layouts...');
  const targetBalances = [
    { itemType: 'PADDY', qty: 5650.200 },
    { itemType: 'HEAD_RICE', qty: 4320.150 }, 
    { itemType: 'BROKEN_RICE', qty: 1420.350 }, 
    { itemType: 'BRAN', qty: 1020.750 },
    { itemType: 'HUSK', qty: 374.000 }
  ];

  for (const row of targetBalances) {
    await prisma.inventory.create({
      data: {
        plantId: mainPlant.id,
        itemType: row.itemType,
        quantity: row.qty
      }
    });
  }

  console.log('🚀 Injecting LAAAAARGE 30-day historical transaction timeline records...');
  const currentDate = new Date();

  // Loop backward 30 days to build deep analytics layout lines
  for (let day = 30; day >= 0; day--) {
    const loopDate = new Date();
    loopDate.setDate(currentDate.getDate() - day);

    // 1. GENERATE PLANT-WISE PROCUREMENT TRENDS (For the Bar Chart)
    for (const plant of existingPlants) {
      let baseWeight = plant.id === mainPlant.id ? 280.500 : 95.200;
      let randomVariance = Math.random() * 60 - 20; 
      let finalNetWeight = parseFloat((baseWeight + randomVariance).toFixed(3));

      const gp = await prisma.gatePass.create({
        data: {
          plantId: plant.id,
          passType: 'INWARD',
          vehicleNo: `AP-39-UR-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'COMPLETED',
          createdAt: loopDate
        }
      });

      await prisma.procurementBatch.create({
        data: {
          plantId: plant.id,
          gatePassId: gp.id,
          grossWeight: finalNetWeight + 14.2,
          tareWeight: 14.2,
          netWeight: finalNetWeight,
          status: 'QC_APPROVED',
          createdAt: loopDate
        }
      });

      await prisma.stockLedger.create({
        data: {
          plantId: plant.id,
          transaction: 'IN',
          itemType: 'PADDY',
          quantity: finalNetWeight,
          reference: gp.id,
          createdAt: loopDate
        }
      });
    }

    // 2. GENERATE MILLING HISTORICAL VOLUMES (For the Line Chart)
    const dailyMillingRuns = 2; 
    for (let run = 1; run <= dailyMillingRuns; run++) {
      const inputPaddyVolume = parseFloat((Math.random() * 40 + 90).toFixed(3)); 
      
      const simulatedYieldPercent = parseFloat((63.2 + (Math.random() * 3.6)).toFixed(2));
      const outputFinishedRice = parseFloat(((inputPaddyVolume * simulatedYieldPercent) / 100).toFixed(3));
      const processingLossAndByproducts = inputPaddyVolume - outputFinishedRice;

      const mp = await prisma.millingProcess.create({
        data: {
          plantId: mainPlant.id,
          batchId: `B-RUN-${loopDate.getFullYear()}${(loopDate.getMonth() + 1).toString().padStart(2, '0')}${loopDate.getDate().toString().padStart(2, '0')}-0${run}`,
          rawMaterialQty: inputPaddyVolume,
          outputQty: outputFinishedRice,
          yieldPercent: simulatedYieldPercent,
          createdAt: loopDate
        }
      });

      await prisma.productionLog.create({
        data: { plantId: mainPlant.id, batchId: mp.id, itemType: 'HEAD_RICE', quantity: outputFinishedRice, createdAt: loopDate }
      });
      await prisma.productionLog.create({
        data: { plantId: mainPlant.id, batchId: mp.id, itemType: 'BROKEN_RICE', quantity: processingLossAndByproducts * 0.4, createdAt: loopDate }
      });
      await prisma.productionLog.create({
        data: { plantId: mainPlant.id, batchId: mp.id, itemType: 'BRAN', quantity: processingLossAndByproducts * 0.3, createdAt: loopDate }
      });
      await prisma.productionLog.create({
        data: { plantId: mainPlant.id, batchId: mp.id, itemType: 'HUSK', quantity: processingLossAndByproducts * 0.3, createdAt: loopDate }
      });

      await prisma.stockLedger.create({
        data: { plantId: mainPlant.id, transaction: 'OUT', itemType: 'PADDY', quantity: inputPaddyVolume, reference: mp.id, createdAt: loopDate }
      });
      await prisma.stockLedger.create({
        data: { plantId: mainPlant.id, transaction: 'IN', itemType: 'HEAD_RICE', quantity: outputFinishedRice, reference: mp.id, createdAt: loopDate }
      });
    }
  }

  console.log('\n✅ Metric data transaction arrays appended successfully!');
  await app.close();
}

main().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
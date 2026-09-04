import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding data for Beas Agro (Beas)...');

  // Find the plant
  const beasPlant = await prisma.plant.findFirst({
    where: { name: { contains: 'Beas Agro' } }
  });

  if (!beasPlant) {
    console.error('Could not find Beas Agro plant in the database.');
    return;
  }

  const plantId = beasPlant.id;
  
  // Date setup
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const dates = [today, yesterday, twoDaysAgo];
  
  // Helper to generate a random number
  const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
  const intRnd = (min: number, max: number) => Math.floor(rnd(min, max));

  for (let i = 0; i < 5; i++) {
    const d = dates[i % dates.length];
    const shift = i % 2 === 0 ? 'Day' : 'Night';
    const batchNo = `BEAS-${d.toISOString().slice(0, 10).replace(/-/g, '')}-${shift.charAt(0)}-${i+1}-${Math.random().toString(36).substring(2, 7)}`;
    
    const paddyUsed = rnd(30, 40); // MT
    const finalRice = paddyUsed * 0.58; // approx 58%
    const nakku = paddyUsed * 0.05;
    const rBran = paddyUsed * 0.08;
    const khanjan = paddyUsed * 0.02;

    await prisma.productionBatch.create({
      data: {
        plantId,
        productionState: 'RICE_MILLING',
        batchNo,
        date: d,
        shift,
        productionLine: 'Line 1',
        paddyType: '1121',
        variety: 'Sella',
        paddySource: 'Local',
        supervisorName: 'Test Supervisor',
        paddyUsedQty: paddyUsed,
        riceProducedQty: finalRice,
        moisture: rnd(12, 14),
        finalRiceBags: Math.floor(finalRice * 1000 / 50), // 50kg bags
        rBranBags: Math.floor(rBran * 1000 / 50),
        nakku1Bags: Math.floor(nakku * 1000 / 50),
        kPhuckBags: Math.floor(khanjan * 1000 / 50),
        batchAnalysis: {
          create: [
            {
              paddyMoisture: rnd(13, 14),
              khanjanBroken: rnd(1, 2),
              polisher1: rnd(5, 7),
              polisher2: rnd(4, 6),
              polisher3: rnd(3, 5),
              polisher4: rnd(2, 4),
              pamalaBroken: rnd(1, 2),
              finalBroken: rnd(0.5, 1.5),
              riceMoisture: rnd(11, 13),
              damagePercent: rnd(0, 1),
              discolourPercent: rnd(0, 1),
              frkPercent: rnd(0, 1),
              entryTime: d.toISOString()
            }
          ]
        }
      }
    });
    console.log(`Created batch ${batchNo} for Beas`);
  }
  
  // --- Seed Paddy Drying Batch ---
  await prisma.productionBatch.create({
    data: {
      plantId: plantId,
      productionState: 'PADDY_DRYING',
      batchNo: 'PD-' + Date.now(),
      date: dates[0],
      shift: 'Day',
      productionLine: 'Line 1',
      paddyType: '1121',
      variety: 'Sella',
      supervisorName: 'Dryer Supervisor',
      paddyUsedQty: 100, // MT
      riceProducedQty: 95, // MT dried paddy
    }
  });

  // --- Seed Intermill Processing Batch ---
  await prisma.productionBatch.create({
    data: {
      plantId: plantId,
      productionState: 'INTERMILL_PROCESSING',
      batchNo: 'IM-' + Date.now(),
      date: dates[0],
      shift: 'Night',
      productionLine: 'Line 2',
      paddyType: 'Raw',
      variety: 'Raw',
      supervisorName: 'Intermill Supervisor',
      paddyUsedQty: 50, // MT
      riceProducedQty: 48, // MT processed
    }
  });

  // --- Seed Plant Off Batch ---
  await prisma.productionBatch.create({
    data: {
      plantId: plantId,
      productionState: 'PLANT_OFF',
      batchNo: 'OFF-' + Date.now(),
      date: dates[0],
      shift: 'Day',
      productionLine: 'Line 1',
      paddyType: 'N/A',
      variety: 'N/A',
      supervisorName: 'Maintenance',
      paddyUsedQty: 0,
      riceProducedQty: 0,
    }
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


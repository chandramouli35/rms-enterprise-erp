const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plants = await prisma.plant.findMany();
  
  if (plants.length === 0) {
    console.log("No plants found to seed data.");
    return;
  }

  // Target date for seeding (2026-09-04 as seen in screenshot)
  const targetDateStr = "2026-09-04T12:00:00.000Z";
  const targetDate = new Date(targetDateStr);

  const shifts = ["Day Shift", "Night Shift"];
  
  for (const plant of plants) {
    for (const shift of shifts) {
      // Create a production batch
      const batch = await prisma.productionBatch.create({
        data: {
          plantId: plant.id,
          batchNo: `TEST-${plant.name.substring(0,3).toUpperCase()}-${shift === 'Day Shift' ? 'D' : 'N'}-${Date.now().toString().substring(8)}`,
          date: targetDate,
          shift: shift,
          productionState: "RICE_MILLING",
          paddyUsedQty: 100,
          riceProducedQty: 60,
          status: "IN_PROGRESS",
          supervisorName: "Test Supervisor",
          operatorName: "Test Operator"
        }
      });

      // Create a few batch analysis records for the batch
      for (let i = 0; i < 3; i++) {
        await prisma.batchAnalysis.create({
          data: {
            productionBatchId: batch.id,
            entryTime: targetDate,
            supervisorName: `Supervisor ${i+1}`,
            paddyMoisture: 14.5 + Math.random(),
            khanjanBroken: 1.2 + Math.random(),
            polisher1: 2.1 + Math.random(),
            polisher2: 2.3 + Math.random(),
            polisher3: 2.5 + Math.random(),
            polisher4: 2.7 + Math.random(),
            difference1To4: 0.6 + Math.random(),
            pamalaBroken: 0.5 + Math.random(),
            finalBroken: 3.5 + Math.random(),
            riceMoisture: 13.5 + Math.random(),
            damagePercent: 0.8 + Math.random(),
            discolourPercent: 0.4 + Math.random(),
            frkPercent: 1.0 + Math.random(),
          }
        });
      }
    }
  }

  console.log("Seeding complete for Analysis Report (2026-09-04).");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

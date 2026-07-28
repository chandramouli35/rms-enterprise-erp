const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const p = await prisma.plant.findFirst();
    const d = await prisma.dispatch.create({
      data: {
        plantId: p.id,
        dispatchNo: 'TEST-1234',
        partyName: 'Test',
        item: 'PADDY',
        quantity: 10
      }
    });
    console.log('Success:', d);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();

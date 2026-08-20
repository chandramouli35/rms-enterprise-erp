const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.stockLedger.count();
  console.log('Total StockLedger records:', count);
  const recent = await prisma.stockLedger.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log(recent);
}
main().finally(() => prisma.$disconnect());

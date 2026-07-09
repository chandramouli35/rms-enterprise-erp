const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findFirst({
    where: { name: 'TEST' },
    include: { modulePermissions: true }
  });
  console.log(JSON.stringify(role, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

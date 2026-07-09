const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'cm@yopmail.com' },
    include: { role: { include: { modulePermissions: true } } }
  });
  const permissions = user.role.modulePermissions;
  console.log(JSON.stringify(permissions, null, 2));

  const moduleName = 'Dashboard';
  const perm = permissions.find(p => (p.moduleName || p.name || '').toLowerCase() === moduleName.toLowerCase());
  
  if (perm) {
    const result = perm.canView === true || String(perm.canView) === 'true';
    console.log('Result:', result);
  } else {
    console.log('Perm not found');
  }
  
  await prisma.$disconnect();
}

main();

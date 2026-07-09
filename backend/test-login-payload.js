const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'cm@yopmail.com' },
    include: {
      role: {
        include: {
          modulePermissions: true,
        },
      },
      plantAccess: true,
    },
  });

  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role.name,
    permissions: user.role.modulePermissions,
  };

  console.log(JSON.stringify(payload.permissions, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);

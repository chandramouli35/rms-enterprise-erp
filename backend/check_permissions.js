const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({
    where: { email: 'cm@yopmail.com' },
    include: {
      role: {
        include: {
          modulePermissions: true
        }
      }
    }
  });
  console.log(JSON.stringify(user?.role?.modulePermissions, null, 2));
}

run()
  .catch(console.error)
  .finally(() => process.exit(0));

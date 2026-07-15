import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supervisor role and user...');

  // 1. Create or get Supervisor Role
  let role = await prisma.role.findFirst({
    where: { name: 'Supervisor' }
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'Supervisor',
        description: 'Plant Supervisor with restricted production and procurement access',
      }
    });
    console.log('Created Supervisor role:', role.id);
  } else {
    console.log('Supervisor role already exists:', role.id);
  }

  // 2. Add permissions for the Supervisor role
  // Supervisor needs access to Production, Procurement, etc.
  const modules = ['Production', 'Procurement', 'Inventory', 'Weighbridge'];
  
  for (const mod of modules) {
    const existingPerm = await prisma.modulePermission.findFirst({
      where: { roleId: role.id, moduleName: mod }
    });

    if (!existingPerm) {
      await prisma.modulePermission.create({
        data: {
          roleId: role.id,
          moduleName: mod,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: false
        }
      });
      console.log(`Added permission for ${mod}`);
    }
  }

  // 3. Create a test user
  const email = 'supervisor@rms.com';
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('supervisor123', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Test Supervisor',
        email: email,
        password: hashedPassword,
        roleId: role.id,
        status: 'ACTIVE'
      }
    });
    console.log('Created test supervisor user:', user.email);

    // Assign to a plant (assume first plant)
    const plant = await prisma.plant.findFirst();
    if (plant) {
      await prisma.userPlantAccess.create({
        data: {
          userId: user.id,
          plantId: plant.id
        }
      });
      console.log(`Assigned supervisor to plant ${plant.name}`);
    }
  } else {
    console.log('Test supervisor user already exists');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

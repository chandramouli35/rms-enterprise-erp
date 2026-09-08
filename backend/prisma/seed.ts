import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

async function main() {
  // 1. Initialize NestJS application context to access PrismaService cleanly
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('🌱 Starting database seeding...');

  // 2. Seed Initial Roles
  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'Full system access across all plants' },
    { name: 'PLANT_MANAGER', description: 'Management access for assigned plants' },
    { name: 'WEIGHBRIDGE_OPERATOR', description: 'Inbound/Outbound weighbridge gate operations' },
    { name: 'ACCOUNTANT', description: 'Financial ledger and expense tracking' },
  ];

  console.log('Creating roles...');
  const roles: Record<string, any> = {};
  for (const role of rolesData) {
    roles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // 3. Seed Plants exactly matching your UI dropdown state
  console.log('Creating plants...');
  const plantHQ = await prisma.plant.upsert({
    where: { code: 'PLANT-HQ' },
    update: {},
    create: {
      name: 'Main Plant (HQ)',
      code: 'PLANT-HQ',
      location: 'Headquarters',
    },
  });

  const plantNorth = await prisma.plant.upsert({
    where: { code: 'PLANT-NORTH' },
    update: {},
    create: {
      name: 'North Branch',
      code: 'PLANT-NORTH',
      location: 'North Zone',
    },
  });

  // 4. Seed Default Super Admin User
  console.log('Creating default Super Admin user...');
  const adminEmail = 'admin@ricefield.com';
  const plainPassword = 'AdminPassword@123';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      username: 'superadmin',
      email: adminEmail,
      passwordHash: passwordHash,
      roleId: roles['SUPER_ADMIN'].id,
    },
  });

  // 5. Grant Super Admin access to both plants
  console.log('Mapping user plant access rules...');
  await prisma.userPlantAccess.upsert({
    where: {
      userId_plantId: {
        userId: adminUser.id,
        plantId: plantHQ.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      plantId: plantHQ.id,
    },
  });

  await prisma.userPlantAccess.upsert({
    where: {
      userId_plantId: {
        userId: adminUser.id,
        plantId: plantNorth.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      plantId: plantNorth.id,
    },
  });

  console.log('Creating default quantity units...');
  const defaultUnits = [
    { code: 'NOS', label: 'Nos', description: 'Number', isSystem: true },
    { code: 'BAGS', label: 'Bags', description: 'Bags', isSystem: true },
    { code: 'KG', label: 'Kg', description: 'Kilogram', isSystem: true },
    { code: 'QTL', label: 'Qtl', description: 'Quintal', isSystem: true },
    { code: 'LTR', label: 'Ltr', description: 'Liter', isSystem: true },
  ];
  for (const unit of defaultUnits) {
    await prisma.quantityUnit.upsert({
      where: { code: unit.code },
      update: {},
      create: unit,
    });
  }

  console.log('\n✅ Seeding complete successfully!');
  console.log('--------------------------------------------------');
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${plainPassword}`);
  console.log('--------------------------------------------------\n');

  await app.close();
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });
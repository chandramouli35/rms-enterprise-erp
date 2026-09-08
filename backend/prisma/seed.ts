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

  console.log('Seeding Mill Yield Benchmarks (Feedback 03)...');
  const benchmarks = [
    { itemKey: 'PADDY', itemLabel: 'Paddy', requiredQty: 95817, yieldPctPaddy: 100, yieldPctRice: 0, roundFigRicePct: 0, sortOrder: 1 },
    { itemKey: 'NET_RICE', itemLabel: 'Net rice', requiredQty: 63430.854, yieldPctPaddy: 66.2, yieldPctRice: 100, roundFigRicePct: 100, sortOrder: 2 },
    { itemKey: 'KANI', itemLabel: 'kani / Broken Rice', requiredQty: 2874.51, yieldPctPaddy: 3, yieldPctRice: 4.531722054, roundFigRicePct: 4.53, sortOrder: 3 },
    { itemKey: 'NAKKU', itemLabel: 'nakku', requiredQty: 766.536, yieldPctPaddy: 0.8, yieldPctRice: 1.208459215, roundFigRicePct: 1.2, sortOrder: 4 },
    { itemKey: 'REJECTION', itemLabel: 'Rejection', requiredQty: 958.17, yieldPctPaddy: 1, yieldPctRice: 1.510574018, roundFigRicePct: 1.5, sortOrder: 5 },
    { itemKey: 'BRAN', itemLabel: 'Bran / R. Bran', requiredQty: 8144.445, yieldPctPaddy: 8.5, yieldPctRice: 12.83987915, roundFigRicePct: 12.8, sortOrder: 6 },
    { itemKey: 'K_PHUCK', itemLabel: 'K.Phuck', requiredQty: 2395.425, yieldPctPaddy: 2.5, yieldPctRice: 3.776435045, roundFigRicePct: 3.7, sortOrder: 7 },
    { itemKey: 'HUSK', itemLabel: 'Husk', requiredQty: 15809.805, yieldPctPaddy: 16.5, yieldPctRice: 24.9244713, roundFigRicePct: 24.92, sortOrder: 8 },
    { itemKey: 'PURCHASED_RICE', itemLabel: 'Purchased Rice', requiredQty: 3832.68, yieldPctPaddy: 4, yieldPctRice: 6.042296073, roundFigRicePct: 6, sortOrder: 9 },
  ];
  for (const b of benchmarks) {
    await prisma.millYieldBenchmark.upsert({
      where: { itemKey: b.itemKey },
      update: {},
      create: b,
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
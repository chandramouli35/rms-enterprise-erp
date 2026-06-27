"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const prisma = app.get(prisma_service_1.PrismaService);
    console.log('🌱 Starting database seeding...');
    const rolesData = [
        { name: 'SUPER_ADMIN', description: 'Full system access across all plants' },
        { name: 'PLANT_MANAGER', description: 'Management access for assigned plants' },
        { name: 'WEIGHBRIDGE_OPERATOR', description: 'Inbound/Outbound weighbridge gate operations' },
        { name: 'ACCOUNTANT', description: 'Financial ledger and expense tracking' },
    ];
    console.log('Creating roles...');
    const roles = {};
    for (const role of rolesData) {
        roles[role.name] = await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        });
    }
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
//# sourceMappingURL=seed.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const plant = await prisma.plant.findFirst();
    if (!plant) {
        console.log("No plant found!");
        return;
    }
    const batchNo = 'TEST-BATCH-' + Math.floor(Math.random() * 1000);
    const batch = await prisma.productionBatch.create({
        data: {
            plantId: plant.id,
            batchNo: batchNo,
            date: new Date(),
            shift: 'Day Shift',
            productionLine: 'Line 1',
            paddyType: 'Raw',
            variety: 'Sugandha',
            paddyUsedQty: 50,
            status: 'In Progress'
        }
    });
    console.log("Successfully created batch:", batch.batchNo);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=create-test.js.map
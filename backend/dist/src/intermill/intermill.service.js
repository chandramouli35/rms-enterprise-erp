"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntermillService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
let IntermillService = class IntermillService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    async create(createDto, user) {
        const { batchNo, shift, date, startTime, endTime, rawMaterialId, inputBags, outputs, plantId } = createDto;
        let totalOutputBags = 0;
        for (const out of outputs) {
            totalOutputBags += Number(out.outputBags);
        }
        const wastage = Number(inputBags) - totalOutputBags;
        const lossPercentage = (wastage / Number(inputBags)) * 100;
        let status = 'COMPLETED';
        if (lossPercentage > 2) {
            status = 'PENDING_APPROVAL';
        }
        const batch = await this.prisma.intermillBatch.create({
            data: {
                batchNo,
                shift,
                supervisorId: user.userId,
                date: new Date(date),
                startTime,
                endTime,
                rawMaterialId,
                inputBags: Number(inputBags),
                status,
                plantId,
                outputs: {
                    create: outputs.map((out) => ({
                        productId: out.productId,
                        outputBags: Number(out.outputBags),
                    })),
                },
            },
            include: {
                outputs: true,
            },
        });
        if (status === 'COMPLETED') {
            await this.processInventoryUpdate(batch.id);
        }
        return batch;
    }
    async findAll(user) {
        let whereClause = {};
        if (user.role !== 'Admin') {
            whereClause = {
                plantId: user.plantId
            };
        }
        return this.prisma.intermillBatch.findMany({
            where: whereClause,
            include: {
                rawMaterial: true,
                supervisor: {
                    select: { username: true }
                },
                outputs: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async approve(id, user) {
        if (user.role !== 'Admin') {
            throw new common_1.BadRequestException('Only Admin can approve intermill batches');
        }
        const batch = await this.prisma.intermillBatch.findUnique({
            where: { id },
            include: { outputs: true }
        });
        if (!batch) {
            throw new common_1.BadRequestException('Batch not found');
        }
        if (batch.status !== 'PENDING_APPROVAL') {
            throw new common_1.BadRequestException('Batch is not pending approval');
        }
        const updatedBatch = await this.prisma.intermillBatch.update({
            where: { id },
            data: { status: 'COMPLETED' },
        });
        await this.processInventoryUpdate(batch.id);
        return updatedBatch;
    }
    async processInventoryUpdate(batchId) {
        const batch = await this.prisma.intermillBatch.findUnique({
            where: { id: batchId },
            include: { outputs: true }
        });
        if (!batch)
            return;
    }
    async updateStock(plantId, productId, bagDiff) {
    }
};
exports.IntermillService = IntermillService;
exports.IntermillService = IntermillService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService])
], IntermillService);
//# sourceMappingURL=intermill.service.js.map
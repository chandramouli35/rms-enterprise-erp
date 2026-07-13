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
exports.ProductionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
let ProductionService = class ProductionService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    async getMetrics(plantId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const batchesToday = await this.prisma.productionBatch.count({
            where: {
                plantId,
                date: {
                    gte: today,
                },
            },
        });
        const metricsAgg = await this.prisma.productionBatch.aggregate({
            where: {
                plantId,
                date: {
                    gte: today,
                },
            },
            _sum: {
                paddyUsedQty: true,
                riceProducedQty: true,
            },
        });
        const lossAgg = await this.prisma.processLoss.aggregate({
            where: {
                batch: {
                    plantId,
                    date: { gte: today },
                },
            },
            _sum: {
                totalLoss: true,
            },
        });
        const byProductAgg = await this.prisma.byProduct.aggregate({
            where: {
                batch: {
                    plantId,
                    date: { gte: today },
                },
            },
            _sum: {
                quantity: true,
            },
        });
        const paddyUsed = metricsAgg._sum.paddyUsedQty || 0;
        const riceProduced = metricsAgg._sum.riceProducedQty || 0;
        const avgYield = paddyUsed > 0 ? (riceProduced / paddyUsed) * 100 : 0;
        return {
            batchesToday,
            totalPaddyUsed: paddyUsed,
            totalRiceProduced: riceProduced,
            avgYield: avgYield.toFixed(2),
            totalProcessLoss: lossAgg._sum.totalLoss || 0,
            totalByProducts: byProductAgg._sum.quantity || 0,
        };
    }
    async getBatches(plantId, status, dateFrom, dateTo) {
        const where = { plantId };
        if (status && status !== 'All')
            where.status = status;
        if (dateFrom && dateTo) {
            where.date = { gte: new Date(dateFrom), lte: new Date(dateTo) };
        }
        return this.prisma.productionBatch.findMany({
            where,
            orderBy: { date: 'desc' }
        });
    }
    async getBatchDetails(id) {
        const batch = await this.prisma.productionBatch.findUnique({
            where: { id },
            include: {
                processLoss: true,
                byProducts: true,
                yieldReport: true,
            },
        });
        if (!batch)
            throw new common_1.NotFoundException('Batch not found');
        return batch;
    }
    async createBatch(dto) {
        const batch = await this.prisma.productionBatch.create({
            data: {
                plantId: dto.plantId,
                batchNo: dto.batchNo,
                date: new Date(dto.date),
                shift: dto.shift,
                productionLine: dto.productionLine,
                paddyType: dto.paddyType,
                variety: dto.variety,
                paddySource: dto.paddySource,
                paddyUsedQty: dto.paddyUsedQty,
                remarks: dto.remarks,
                status: 'In Progress',
                progress: 0,
            },
        });
        await this.inventoryService.adjustStock({
            plantId: dto.plantId,
            itemType: 'PADDY',
            variety: dto.variety,
            quantityChange: -dto.paddyUsedQty,
            transactionType: 'OUT',
            referenceId: batch.id,
            remarks: `Issued to production batch ${batch.batchNo}`,
            shift: dto.shift
        });
        return batch;
    }
    async completeBatch(batchId, data) {
        const { riceProducedQty, byProducts, processLoss, yieldReport } = data;
        const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
        if (!batch)
            throw new common_1.NotFoundException('Batch not found');
        if (batch.status === 'Completed')
            throw new common_1.BadRequestException('Batch is already completed');
        return this.prisma.$transaction(async (tx) => {
            const updatedBatch = await tx.productionBatch.update({
                where: { id: batchId },
                data: {
                    riceProducedQty,
                    status: 'Completed',
                    progress: 100,
                    endTime: new Date()
                }
            });
            if (processLoss) {
                await tx.processLoss.create({
                    data: {
                        productionBatchId: batchId,
                        ...processLoss
                    }
                });
            }
            if (byProducts && byProducts.length > 0) {
                await tx.byProduct.createMany({
                    data: byProducts.map(bp => ({
                        productionBatchId: batchId,
                        name: bp.name,
                        quantity: bp.quantity,
                        utilization: bp.utilization
                    }))
                });
            }
            if (yieldReport) {
                await tx.yieldReport.create({
                    data: {
                        productionBatchId: batchId,
                        plantId: batch.plantId,
                        ...yieldReport
                    }
                });
            }
            await this.inventoryService.adjustStock({
                plantId: batch.plantId,
                itemType: 'RICE',
                variety: batch.variety,
                quantityChange: riceProducedQty,
                transactionType: 'IN',
                referenceId: batch.id,
                remarks: `Produced from batch ${batch.batchNo}`,
                shift: batch.shift
            });
            if (byProducts && byProducts.length > 0) {
                for (const bp of byProducts) {
                    let itemType = 'BY_PRODUCT';
                    if (bp.name.toUpperCase().includes('BRAN'))
                        itemType = 'BRAN';
                    else if (bp.name.toUpperCase().includes('HUSK'))
                        itemType = 'HUSK';
                    await this.inventoryService.adjustStock({
                        plantId: batch.plantId,
                        itemType: itemType,
                        variety: batch.variety,
                        quantityChange: bp.quantity,
                        transactionType: 'IN',
                        referenceId: batch.id,
                        remarks: `By-Product from batch ${batch.batchNo}`,
                        shift: batch.shift
                    });
                }
            }
            return updatedBatch;
        });
    }
};
exports.ProductionService = ProductionService;
exports.ProductionService = ProductionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, inventory_service_1.InventoryService])
], ProductionService);
//# sourceMappingURL=production.service.js.map
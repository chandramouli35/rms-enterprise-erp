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
const client_1 = require("@prisma/client");
const yield_calculator_1 = require("./yield.calculator");
const inventory_service_1 = require("../inventory/inventory.service");
let ProductionService = class ProductionService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    async createBatch(dto) {
        const existing = await this.prisma.batch.findUnique({
            where: { batchNumber: dto.batchNumber }
        });
        if (existing) {
            throw new common_1.BadRequestException(`Batch number ${dto.batchNumber} already exists`);
        }
        const inventoryItem = await this.prisma.inventoryItem.findUnique({
            where: {
                plantId_itemType: {
                    plantId: dto.plantId,
                    itemType: 'PADDY',
                },
            },
        });
        if (!inventoryItem || inventoryItem.quantity < dto.rawMaterialQty) {
            throw new common_1.BadRequestException(`Insufficient stock for PADDY. Current: ${inventoryItem?.quantity || 0} MT`);
        }
        const batch = await this.prisma.batch.create({
            data: {
                batchNumber: dto.batchNumber,
                plantId: dto.plantId,
                rawMaterialQty: dto.rawMaterialQty,
                status: client_1.MillingStatus.PENDING,
            },
        });
        try {
            await this.inventoryService.processTransaction({
                plantId: dto.plantId,
                itemType: 'PADDY',
                itemCategory: 'RAW_MATERIAL',
                quantity: -dto.rawMaterialQty,
                transactionType: client_1.TransactionType.OUT,
                referenceId: batch.id,
                remarks: `Issued to Batch ${dto.batchNumber}`,
            });
        }
        catch (error) {
            await this.prisma.batch.delete({ where: { id: batch.id } });
            throw error;
        }
        return batch;
    }
    async startMilling(batchId) {
        const batch = await this.prisma.batch.findUnique({ where: { id: batchId } });
        if (!batch)
            throw new common_1.NotFoundException('Batch not found');
        if (batch.status !== client_1.MillingStatus.PENDING) {
            throw new common_1.BadRequestException('Batch is already running or completed');
        }
        const milling = await this.prisma.millingProcess.create({
            data: {
                batchId: batch.id,
                status: client_1.MillingStatus.RUNNING,
                startTime: new Date(),
            },
        });
        await this.prisma.batch.update({
            where: { id: batchId },
            data: { status: client_1.MillingStatus.RUNNING },
        });
        return milling;
    }
    async stopMilling(batchId) {
        const batch = await this.prisma.batch.findUnique({
            where: { id: batchId },
            include: { millingProcess: true }
        });
        if (!batch || !batch.millingProcess)
            throw new common_1.NotFoundException('Running process not found');
        await this.prisma.millingProcess.update({
            where: { id: batch.millingProcess.id },
            data: {
                status: client_1.MillingStatus.COMPLETED,
                endTime: new Date(),
            },
        });
        return this.prisma.batch.update({
            where: { id: batchId },
            data: { status: client_1.MillingStatus.COMPLETED },
        });
    }
    async addProductionLog(millingProcessId, dto) {
        const process = await this.prisma.millingProcess.findUnique({
            where: { id: millingProcessId },
            include: { batch: true, productionLogs: true },
        });
        if (!process)
            throw new common_1.NotFoundException('Milling process not found');
        const totalProduced = process.productionLogs.reduce((sum, log) => sum + log.quantity, 0);
        const newTotal = totalProduced + dto.quantity;
        if (newTotal > process.batch.rawMaterialQty) {
            throw new common_1.BadRequestException(`Cannot log ${dto.quantity} MT. Only ${(process.batch.rawMaterialQty - totalProduced).toFixed(3)} MT remaining from original ${process.batch.rawMaterialQty} MT batch.`);
        }
        const log = await this.prisma.productionLog.create({
            data: {
                millingProcessId: process.id,
                itemType: dto.itemType,
                quantity: dto.quantity,
                shift: dto.shift,
            },
        });
        await this.inventoryService.processTransaction({
            plantId: process.batch.plantId,
            itemType: dto.itemType,
            itemCategory: 'FINISHED_GOOD',
            quantity: dto.quantity,
            transactionType: client_1.TransactionType.IN,
            referenceId: process.batch.id,
            remarks: `Produced from Batch ${process.batch.batchNumber}`,
        });
        return log;
    }
    async addProcessLoss(millingProcessId, dto) {
        return this.prisma.processLoss.create({
            data: {
                millingProcessId,
                lossType: dto.lossType,
                quantity: dto.quantity,
            },
        });
    }
    async getBatchYield(batchId) {
        const batch = await this.prisma.batch.findUnique({
            where: { id: batchId },
            include: {
                millingProcess: {
                    include: {
                        productionLogs: true,
                        processLosses: true,
                    }
                }
            }
        });
        if (!batch)
            throw new common_1.NotFoundException('Batch not found');
        const logs = batch.millingProcess?.productionLogs || [];
        const losses = batch.millingProcess?.processLosses || [];
        const totalProduced = logs.reduce((acc, log) => acc + log.quantity, 0);
        const totalLoss = losses.reduce((acc, loss) => acc + loss.quantity, 0);
        return {
            batchNumber: batch.batchNumber,
            rawMaterialQty: batch.rawMaterialQty,
            totalProduced,
            totalLoss,
            yieldPercentage: yield_calculator_1.YieldCalculator.calculateYield(batch.rawMaterialQty, totalProduced),
            lossPercentage: yield_calculator_1.YieldCalculator.calculateProcessLossPercentage(batch.rawMaterialQty, totalLoss),
            productionLogs: logs,
            processLosses: losses
        };
    }
    async findAllBatches(plantId) {
        return this.prisma.batch.findMany({
            where: { plantId },
            include: {
                millingProcess: {
                    include: {
                        productionLogs: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPlantYieldAnalytics(plantId) {
        const batches = await this.prisma.batch.findMany({
            where: {
                plantId,
                status: client_1.MillingStatus.COMPLETED
            },
            include: {
                millingProcess: {
                    include: {
                        productionLogs: true,
                        processLosses: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        const yieldData = batches.map(batch => {
            const logs = batch.millingProcess?.productionLogs || [];
            const totalProduced = logs.reduce((acc, log) => acc + log.quantity, 0);
            return {
                name: batch.batchNumber,
                raw: batch.rawMaterialQty,
                produced: totalProduced,
                yield: yield_calculator_1.YieldCalculator.calculateYield(batch.rawMaterialQty, totalProduced)
            };
        });
        const lossAggregates = {};
        batches.forEach(batch => {
            const losses = batch.millingProcess?.processLosses || [];
            losses.forEach(loss => {
                lossAggregates[loss.lossType] = (lossAggregates[loss.lossType] || 0) + loss.quantity;
            });
        });
        const lossData = Object.keys(lossAggregates).map(type => ({
            name: type,
            value: lossAggregates[type]
        }));
        return { yieldData, lossData };
    }
};
exports.ProductionService = ProductionService;
exports.ProductionService = ProductionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_service_1.InventoryService])
], ProductionService);
//# sourceMappingURL=production.service.js.map
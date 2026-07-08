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
let ProductionService = class ProductionService {
    constructor(prisma) {
        this.prisma = prisma;
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
    async getBatches(plantId) {
        return this.prisma.productionBatch.findMany({
            where: { plantId },
            orderBy: { date: 'desc' },
            include: {
                processLoss: true,
                byProducts: true,
                yieldReport: true,
            },
        });
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
        return batch;
    }
};
exports.ProductionService = ProductionService;
exports.ProductionService = ProductionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductionService);
//# sourceMappingURL=production.service.js.map
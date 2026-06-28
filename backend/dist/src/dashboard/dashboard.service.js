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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(plantId) {
        const userCount = await this.prisma.userPlantAccess.count({
            where: { plantId },
        });
        const procurementAgg = await this.prisma.procurementBatch.aggregate({
            where: { plantId },
            _sum: { netWeight: true },
            _count: { gatePassId: true },
        });
        const inventoryAgg = await this.prisma.inventoryItem.aggregate({
            where: { plantId, itemType: 'PADDY' },
            _sum: { quantity: true },
        });
        const gatePassCount = await this.prisma.gatePass.count({
            where: { plantId },
        });
        return {
            activeUsers: userCount,
            procurementMT: procurementAgg._sum.netWeight || 0,
            inventoryMT: inventoryAgg._sum.quantity || 0,
            gatePasses: gatePassCount,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map
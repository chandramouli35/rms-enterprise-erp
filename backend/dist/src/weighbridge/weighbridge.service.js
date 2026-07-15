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
exports.WeighbridgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WeighbridgeService = class WeighbridgeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async streamWeight(vehicleNo) {
        const activePass = await this.prisma.gatePass.findFirst({
            where: { vehicleNo, status: 'ACTIVE', passType: 'INWARD' }
        });
        if (!activePass) {
            throw new common_1.NotFoundException(`No active INWARD gate pass found for vehicle ${vehicleNo}`);
        }
        return {
            vehicleNo,
            grossWeight: 9400,
            status: 'Stable',
            timestamp: new Date()
        };
    }
    async saveTransaction(data) {
        const { plantId, vehicleNo, grossWeight, tareWeight, netWeight, transactionType, driverName, materialType, supplierName, challanNo, remarks, gatePassId } = data;
        let resolvedGatePassId = null;
        if (gatePassId) {
            const gp = await this.prisma.gatePass.findFirst({
                where: { qrCode: gatePassId, plantId }
            });
            if (gp) {
                resolvedGatePassId = gp.id;
                await this.prisma.gatePass.update({
                    where: { id: resolvedGatePassId },
                    data: {
                        sodaPendingId: data.sodaPendingId,
                        qualityCutType: data.qualityCutType,
                        qualityCutValue: data.qualityCutValue,
                        qualityCutReason: data.qualityCutReason,
                        noOfBags: data.bagsReceived
                    }
                });
            }
        }
        const transaction = await this.prisma.weighbridgeTransaction.create({
            data: {
                plantId,
                vehicleNo,
                transactionType,
                driverName,
                materialType,
                supplierName,
                challanNo,
                remarks,
                gatePassId: resolvedGatePassId,
                grossWeight,
                tareWeight,
                netWeight,
                grossTime: new Date(),
                status: 'COMPLETED'
            }
        });
        return transaction;
    }
    async getHistory(plantId) {
        return this.prisma.weighbridgeTransaction.findMany({
            where: { plantId },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }
    async getSettings(plantId) {
        let settings = await this.prisma.weighbridgeSettings.findUnique({
            where: { plantId }
        });
        if (!settings) {
            settings = await this.prisma.weighbridgeSettings.create({
                data: { plantId }
            });
        }
        return settings;
    }
    async updateSettings(plantId, data) {
        return this.prisma.weighbridgeSettings.upsert({
            where: { plantId },
            update: data,
            create: { plantId, ...data }
        });
    }
};
exports.WeighbridgeService = WeighbridgeService;
exports.WeighbridgeService = WeighbridgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WeighbridgeService);
//# sourceMappingURL=weighbridge.service.js.map
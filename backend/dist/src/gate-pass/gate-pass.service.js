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
exports.GatePassService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
let GatePassService = class GatePassService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    async generateGatePass(data) {
        const { plantId, passType, vehicleNo, vehicleType, purpose, supplierId, material, driverName, contactNo, challanNo, noOfBags, grossWeight, tareWeight, netWeight, emptyVideoTime, loadedVideoTime, partyName, ntWtParty, sodaNo, remarks } = data;
        if (passType === 'INWARD') {
            const existingActivePass = await this.prisma.gatePass.findFirst({
                where: {
                    plantId,
                    vehicleNo,
                    passType: 'INWARD',
                    status: 'ACTIVE'
                }
            });
            if (existingActivePass) {
                await this.prisma.duplicateGatePassLog.create({
                    data: {
                        plantId,
                        vehicleNo,
                        attemptedType: 'INWARD',
                        reason: 'Vehicle already has an active INWARD pass'
                    }
                });
                throw new common_1.ConflictException(`Vehicle ${vehicleNo} already has an active INWARD pass in the campus.`);
            }
        }
        const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
        const year = new Date().getFullYear();
        const lastPass = await this.prisma.gatePass.findFirst({
            where: {
                plantId,
                passType,
                qrCode: { startsWith: `${prefix}-${year}-` }
            },
            orderBy: { qrCode: 'desc' }
        });
        let nextSeq = 1;
        if (lastPass && lastPass.qrCode) {
            const parts = lastPass.qrCode.split('-');
            if (parts.length === 3) {
                nextSeq = parseInt(parts[2], 10) + 1;
            }
        }
        const seq = String(nextSeq).padStart(5, '0');
        const qrCode = `${prefix}-${year}-${seq}`;
        const newPass = await this.prisma.gatePass.create({
            data: {
                plantId,
                passType,
                vehicleNo,
                vehicleType,
                purpose,
                supplierId: supplierId || null,
                material,
                driverName,
                contactNo,
                challanNo,
                noOfBags: noOfBags ? parseInt(noOfBags) : null,
                grossWeight: grossWeight ? parseFloat(grossWeight) : null,
                tareWeight: tareWeight ? parseFloat(tareWeight) : null,
                netWeight: netWeight ? parseFloat(netWeight) : null,
                emptyVideoTime,
                loadedVideoTime,
                partyName,
                ntWtParty: ntWtParty ? parseFloat(ntWtParty) : null,
                sodaNo,
                remarks,
                status: 'ACTIVE',
                qrCode
            },
            include: {
                supplier: true,
                procurementBatch: {
                    include: {
                        quality: true,
                        weighbridge: true,
                        paddyInwardDetails: true
                    }
                }
            }
        });
        return newPass;
    }
    async getRecentGatePasses(plantId, type) {
        const whereClause = { plantId };
        if (type !== 'ALL') {
            whereClause.passType = type;
        }
        return this.prisma.gatePass.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: type === 'ALL' ? 50 : 5,
            include: { supplier: true }
        });
    }
    async getGatePassByQr(qrCode) {
        const pass = await this.prisma.gatePass.findFirst({
            where: { qrCode },
            include: {
                supplier: true,
                procurementBatch: {
                    include: {
                        quality: true,
                        weighbridge: true,
                        paddyInwardDetails: true
                    }
                }
            }
        });
        if (!pass) {
            throw new common_1.NotFoundException(`Gate pass with QR code ${qrCode} not found`);
        }
        const latestWeighbridge = await this.prisma.weighbridgeTransaction.findFirst({
            where: {
                plantId: pass.plantId,
                vehicleNo: pass.vehicleNo,
                createdAt: { gte: pass.createdAt }
            },
            orderBy: { createdAt: 'desc' }
        });
        return {
            ...pass,
            latestWeighbridge
        };
    }
    async getAnalytics(plantId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const totalGateIn = await this.prisma.gatePass.count({
            where: { plantId, passType: 'INWARD', createdAt: { gte: today } }
        });
        const totalGateOut = await this.prisma.gatePass.count({
            where: { plantId, passType: 'OUTWARD', createdAt: { gte: today } }
        });
        const activeInward = await this.prisma.gatePass.count({
            where: { plantId, status: 'ACTIVE', passType: 'INWARD' }
        });
        return {
            totalGateIn,
            totalGateOut,
            qrScanned: totalGateIn + totalGateOut,
            duplicatesBlocked: 5,
            activeGatePass: activeInward
        };
    }
    async getCampusStatus(plantId) {
        const activeInward = await this.prisma.gatePass.count({
            where: { plantId, status: 'ACTIVE', passType: 'INWARD' }
        });
        const completed = await this.prisma.gatePass.count({
            where: { plantId, status: 'COMPLETED' }
        });
        return {
            activeInward,
            completed,
            total: activeInward + completed
        };
    }
    async getDuplicateLogs(plantId) {
        return this.prisma.duplicateGatePassLog.findMany({
            where: { plantId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }
    async completeGatePass(id) {
        const pass = await this.prisma.gatePass.findUnique({ where: { id } });
        if (!pass)
            throw new common_1.NotFoundException('Gate Pass not found');
        if (pass.status === 'COMPLETED')
            throw new common_1.BadRequestException('Gate Pass already completed');
        const updatedPass = await this.prisma.gatePass.update({
            where: { id },
            data: { status: 'COMPLETED' }
        });
        if (pass.passType === 'OUTWARD' && pass.netWeight && pass.material) {
            let itemType = 'FINISHED_GOODS';
            if (pass.material.toUpperCase().includes('RICE'))
                itemType = 'RICE';
            if (pass.material.toUpperCase().includes('BRAN'))
                itemType = 'BRAN';
            if (pass.material.toUpperCase().includes('HUSK'))
                itemType = 'HUSK';
            await this.inventoryService.adjustStock({
                plantId: pass.plantId,
                itemType: itemType,
                variety: pass.material,
                quantityChange: -pass.netWeight,
                transactionType: 'OUT',
                referenceId: pass.id,
                remarks: `Dispatched via Gate Pass ${pass.qrCode}`
            });
        }
        return updatedPass;
    }
};
exports.GatePassService = GatePassService;
exports.GatePassService = GatePassService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, inventory_service_1.InventoryService])
], GatePassService);
//# sourceMappingURL=gate-pass.service.js.map
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
let GatePassService = class GatePassService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateGatePass(data) {
        const { plantId, passType, vehicleNo, vehicleType, purpose, supplierId, material, driverName, contactNo, challanNo, noOfBags, grossWeight, tareWeight, netWeight } = data;
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
        const lastPass = await this.prisma.gatePass.findFirst({
            where: { plantId, passType },
            orderBy: { createdAt: 'desc' }
        });
        let nextSeq = 1;
        if (lastPass && lastPass.qrCode) {
            const parts = lastPass.qrCode.split('-');
            if (parts.length === 3) {
                nextSeq = parseInt(parts[2], 10) + 1;
            }
        }
        const seq = String(nextSeq).padStart(5, '0');
        const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
        const year = new Date().getFullYear();
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
                status: 'ACTIVE',
                qrCode
            },
            include: { supplier: true }
        });
        return newPass;
    }
    async getRecentGatePasses(plantId, type) {
        return this.prisma.gatePass.findMany({
            where: { plantId, passType: type },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { supplier: true }
        });
    }
    async getGatePassByQr(qrCode) {
        const pass = await this.prisma.gatePass.findFirst({
            where: { qrCode },
            include: { supplier: true }
        });
        if (!pass) {
            throw new common_1.NotFoundException(`Gate pass with QR code ${qrCode} not found`);
        }
        return pass;
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
};
exports.GatePassService = GatePassService;
exports.GatePassService = GatePassService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GatePassService);
//# sourceMappingURL=gate-pass.service.js.map
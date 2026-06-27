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
exports.GatePassesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let GatePassesService = class GatePassesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(plantId, userId, data) {
        const MAX_RETRIES = 3;
        let retries = 0;
        while (retries < MAX_RETRIES) {
            try {
                return await this.prisma.$transaction(async (tx) => {
                    const today = new Date();
                    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
                    const prefix = `GP-${dateStr}-`;
                    const lastPass = await tx.gatePass.findFirst({
                        where: {
                            plantId,
                            passNumber: { startsWith: prefix }
                        },
                        orderBy: { passNumber: 'desc' },
                    });
                    let nextSeq = 1;
                    if (lastPass) {
                        const lastSeqStr = lastPass.passNumber.replace(prefix, '');
                        const lastSeq = parseInt(lastSeqStr, 10);
                        if (!isNaN(lastSeq)) {
                            nextSeq = lastSeq + 1;
                        }
                    }
                    const passNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
                    return await tx.gatePass.create({
                        data: {
                            passNumber,
                            vehicleNumber: data.vehicleNumber,
                            driverName: data.driverName,
                            driverLicense: data.driverLicense,
                            source: data.source,
                            supplierId: data.supplierId || null,
                            estimatedBags: data.estimatedBags ? parseInt(data.estimatedBags, 10) : null,
                            plantId,
                            createdByUserId: userId,
                            status: 'GENERATED',
                        },
                        include: { supplier: true }
                    });
                }, {
                    isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
                });
            }
            catch (error) {
                if (error.code === 'P2002' && error.meta?.target?.includes('passNumber')) {
                    retries++;
                    if (retries >= MAX_RETRIES) {
                        throw new common_1.ConflictException('Failed to generate unique Gate Pass number due to high concurrency. Please try again.');
                    }
                    continue;
                }
                throw error;
            }
        }
    }
    async findAll(plantId) {
        return this.prisma.gatePass.findMany({
            where: { plantId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { supplier: true }
        });
    }
    async scanBarcode(plantId, barcode) {
        const gatePass = await this.prisma.gatePass.findFirst({
            where: { passNumber: barcode, plantId, deletedAt: null },
            include: {
                supplier: true,
                qualityCheck: true,
                weighbridge: true
            }
        });
        if (!gatePass) {
            throw new common_1.NotFoundException('Gate Pass not found or belongs to another plant');
        }
        return gatePass;
    }
};
exports.GatePassesService = GatePassesService;
exports.GatePassesService = GatePassesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GatePassesService);
//# sourceMappingURL=gate-passes.service.js.map
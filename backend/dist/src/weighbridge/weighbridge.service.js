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
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async captureWeight(plantId, user, data) {
        const { gatePassId, weight, isManualOverride, overrideReason, type } = data;
        if (isManualOverride) {
            if (user.role !== 'PLANT_MANAGER' && user.role !== 'SUPER_ADMIN') {
                throw new common_1.ForbiddenException('Only Plant Manager or Super Admin can approve manual overrides');
            }
        }
        const gatePass = await this.prisma.gatePass.findFirst({
            where: { id: gatePassId, plantId, deletedAt: null }
        });
        if (!gatePass)
            throw new common_1.NotFoundException('Gate Pass not found');
        const existingTx = await this.prisma.weighbridgeTransaction.findUnique({
            where: { gatePassId }
        });
        if (type === 'GROSS') {
            if (existingTx?.grossWeight) {
                throw new common_1.BadRequestException('Gross weight already captured');
            }
            if (gatePass.status !== 'GENERATED') {
                throw new common_1.BadRequestException('Gate Pass must be in GENERATED status to capture Gross Weight');
            }
            await this.prisma.$transaction([
                this.prisma.weighbridgeTransaction.upsert({
                    where: { gatePassId },
                    create: {
                        gatePassId,
                        grossWeight: weight,
                        grossTimestamp: new Date(),
                        manualOverrideFlag: isManualOverride || false,
                        overrideReason: isManualOverride ? overrideReason : null,
                        approvedByUserId: isManualOverride ? user.id : null,
                    },
                    update: {
                        grossWeight: weight,
                        grossTimestamp: new Date(),
                        manualOverrideFlag: isManualOverride || false,
                        overrideReason: isManualOverride ? overrideReason : null,
                        approvedByUserId: isManualOverride ? user.id : null,
                    }
                }),
                this.prisma.gatePass.update({
                    where: { id: gatePassId },
                    data: { status: 'GROSS_WEIGHED' }
                })
            ]);
        }
        else if (type === 'TARE') {
            if (!existingTx || !existingTx.grossWeight) {
                throw new common_1.BadRequestException('Cannot capture Tare weight without Gross weight');
            }
            if (existingTx.tareWeight) {
                throw new common_1.BadRequestException('Tare weight already captured');
            }
            if (gatePass.status !== 'QC_PASSED') {
                throw new common_1.BadRequestException('Gate Pass must be QC_PASSED to capture Tare Weight');
            }
            const netWeight = existingTx.grossWeight - weight;
            if (netWeight <= 0) {
                throw new common_1.BadRequestException('Invalid weight: Tare cannot be greater than or equal to Gross');
            }
            await this.prisma.$transaction([
                this.prisma.weighbridgeTransaction.update({
                    where: { gatePassId },
                    data: {
                        tareWeight: weight,
                        netWeight,
                        tareTimestamp: new Date(),
                    }
                }),
                this.prisma.gatePass.update({
                    where: { id: gatePassId },
                    data: { status: 'TARE_WEIGHED' }
                }),
                this.prisma.procurementBatch.create({
                    data: {
                        plantId,
                        gatePassId,
                        grossWeight: existingTx.grossWeight,
                        tareWeight: weight,
                        netWeight,
                        status: 'QC_APPROVED',
                    }
                }),
                this.prisma.inventory.upsert({
                    where: {
                        plantId_itemType: { plantId, itemType: 'PADDY' }
                    },
                    create: {
                        plantId,
                        itemType: 'PADDY',
                        quantity: netWeight
                    },
                    update: {
                        quantity: { increment: netWeight }
                    }
                })
            ]);
        }
        else {
            throw new common_1.BadRequestException('Invalid capture type');
        }
        return { success: true };
    }
};
exports.WeighbridgeService = WeighbridgeService;
exports.WeighbridgeService = WeighbridgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WeighbridgeService);
//# sourceMappingURL=weighbridge.service.js.map
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
exports.QualityChecksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let QualityChecksService = class QualityChecksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(plantId, inspectorId, data) {
        const gatePass = await this.prisma.gatePass.findFirst({
            where: { id: data.gatePassId, plantId, deletedAt: null }
        });
        if (!gatePass) {
            throw new common_1.NotFoundException('Gate Pass not found');
        }
        const existingQc = await this.prisma.qualityCheck.findUnique({
            where: { gatePassId: data.gatePassId }
        });
        if (existingQc) {
            throw new common_1.BadRequestException('Quality Check already performed for this Gate Pass');
        }
        const m = parseFloat(data.moisturePercentage);
        const b = parseFloat(data.brokenGrainsPercentage);
        let status = 'APPROVED';
        let deduction = 0;
        if (m > 18.0 || b > 10.0) {
            status = 'REJECTED';
        }
        else if (m > 14.0 || b > 5.0) {
            status = 'ACCEPTED_WITH_DEDUCTION';
            if (m > 14.0)
                deduction += (m - 14.0) * 50;
            if (b > 5.0)
                deduction += (b - 5.0) * 30;
        }
        const qc = await this.prisma.qualityCheck.create({
            data: {
                gatePassId: data.gatePassId,
                moisturePercentage: m,
                discolorationPercentage: parseFloat(data.discolorationPercentage),
                brokenGrainsPercentage: b,
                foreignMatterPercentage: parseFloat(data.foreignMatterPercentage),
                status,
                priceDeductionPerMT: deduction,
                inspectorId,
            }
        });
        if (status === 'REJECTED') {
            await this.prisma.gatePass.update({
                where: { id: data.gatePassId },
                data: { status: 'REJECTED' }
            });
        }
        else {
            await this.prisma.gatePass.update({
                where: { id: data.gatePassId },
                data: { status: 'QC_PASSED' }
            });
        }
        return qc;
    }
};
exports.QualityChecksService = QualityChecksService;
exports.QualityChecksService = QualityChecksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QualityChecksService);
//# sourceMappingURL=quality-checks.service.js.map
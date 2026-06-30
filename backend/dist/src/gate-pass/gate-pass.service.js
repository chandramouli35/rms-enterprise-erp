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
        const { plantId, passType, vehicleNo, purpose, driverName, contactNo } = data;
        const count = await this.prisma.gatePass.count({
            where: { plantId, passType }
        });
        const seq = String(count + 1).padStart(5, '0');
        const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
        const year = new Date().getFullYear();
        const qrCode = `${prefix}-${year}-${seq}`;
        const newPass = await this.prisma.gatePass.create({
            data: {
                plantId,
                passType,
                vehicleNo,
                purpose,
                driverName,
                contactNo,
                status: 'ACTIVE',
                qrCode
            }
        });
        return newPass;
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
};
exports.GatePassService = GatePassService;
exports.GatePassService = GatePassService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GatePassService);
//# sourceMappingURL=gate-pass.service.js.map
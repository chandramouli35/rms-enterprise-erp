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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeighbridgeController = void 0;
const common_1 = require("@nestjs/common");
const weighbridge_service_1 = require("./weighbridge.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const plant_context_guard_1 = require("../common/guards/plant-context.guard");
const prisma_service_1 = require("../prisma/prisma.service");
let WeighbridgeController = class WeighbridgeController {
    constructor(weighbridgeService, prisma) {
        this.weighbridgeService = weighbridgeService;
        this.prisma = prisma;
    }
    getPlantId(req) {
        const plantId = req.headers['x-plant-id'];
        if (!plantId)
            throw new common_1.UnauthorizedException('Plant context missing');
        return plantId;
    }
    async captureWeight(data, req) {
        const role = req.user.role?.name || req.user.role;
        return this.weighbridgeService.captureWeight(this.getPlantId(req), { ...req.user, role }, data);
    }
    async getActiveQueue(req) {
        return this.prisma.gatePass.findMany({
            where: {
                plantId: this.getPlantId(req),
                status: { in: ['GENERATED', 'QC_PASSED'] },
                deletedAt: null
            },
            include: {
                supplier: true,
            },
            orderBy: { createdAt: 'asc' }
        });
    }
};
exports.WeighbridgeController = WeighbridgeController;
__decorate([
    (0, common_1.Post)('capture-weight'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WeighbridgeController.prototype, "captureWeight", null);
__decorate([
    (0, common_1.Get)('active-queue'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WeighbridgeController.prototype, "getActiveQueue", null);
exports.WeighbridgeController = WeighbridgeController = __decorate([
    (0, common_1.Controller)('weighbridge'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, plant_context_guard_1.PlantContextGuard),
    __metadata("design:paramtypes", [weighbridge_service_1.WeighbridgeService,
        prisma_service_1.PrismaService])
], WeighbridgeController);
//# sourceMappingURL=weighbridge.controller.js.map
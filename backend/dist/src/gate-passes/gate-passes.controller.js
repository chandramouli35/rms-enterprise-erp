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
exports.GatePassesController = void 0;
const common_1 = require("@nestjs/common");
const gate_passes_service_1 = require("./gate-passes.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const plant_context_guard_1 = require("../common/guards/plant-context.guard");
let GatePassesController = class GatePassesController {
    constructor(gatePassesService) {
        this.gatePassesService = gatePassesService;
    }
    getPlantId(req) {
        const plantId = req.headers['x-plant-id'];
        if (!plantId)
            throw new common_1.UnauthorizedException('Plant context missing');
        return plantId;
    }
    async create(data, req) {
        return this.gatePassesService.create(this.getPlantId(req), req.user.id, data);
    }
    async findAll(req, page, limit, search) {
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '10', 10);
        return this.gatePassesService.findAll(this.getPlantId(req), pageNum, limitNum, search);
    }
    async scanBarcode(barcode, req) {
        return this.gatePassesService.scanBarcode(this.getPlantId(req), barcode);
    }
};
exports.GatePassesController = GatePassesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatePassesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], GatePassesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('scan/:barcode'),
    __param(0, (0, common_1.Param)('barcode')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GatePassesController.prototype, "scanBarcode", null);
exports.GatePassesController = GatePassesController = __decorate([
    (0, common_1.Controller)('gate-passes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, plant_context_guard_1.PlantContextGuard),
    __metadata("design:paramtypes", [gate_passes_service_1.GatePassesService])
], GatePassesController);
//# sourceMappingURL=gate-passes.controller.js.map
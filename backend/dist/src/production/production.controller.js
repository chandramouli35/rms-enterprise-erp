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
exports.ProductionController = void 0;
const common_1 = require("@nestjs/common");
const production_service_1 = require("./production.service");
const create_batch_dto_1 = require("./dto/create-batch.dto");
const create_production_log_dto_1 = require("./dto/create-production-log.dto");
const create_process_loss_dto_1 = require("./dto/create-process-loss.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let ProductionController = class ProductionController {
    constructor(productionService) {
        this.productionService = productionService;
    }
    createBatch(dto) {
        return this.productionService.createBatch(dto);
    }
    startMilling(id) {
        return this.productionService.startMilling(id);
    }
    stopMilling(id) {
        return this.productionService.stopMilling(id);
    }
    addProductionLog(id, dto) {
        return this.productionService.addProductionLog(id, dto);
    }
    addProcessLoss(id, dto) {
        return this.productionService.addProcessLoss(id, dto);
    }
    getBatchYield(id) {
        return this.productionService.getBatchYield(id);
    }
    findAllBatches(plantId) {
        return this.productionService.findAllBatches(plantId);
    }
    getPlantYieldAnalytics(plantId) {
        return this.productionService.getPlantYieldAnalytics(plantId);
    }
};
exports.ProductionController = ProductionController;
__decorate([
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'PLANT_MANAGER'),
    (0, common_1.Post)('batches'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_batch_dto_1.CreateBatchDto]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "createBatch", null);
__decorate([
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'PLANT_MANAGER'),
    (0, common_1.Post)('batches/:id/start'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "startMilling", null);
__decorate([
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'PLANT_MANAGER'),
    (0, common_1.Post)('batches/:id/stop'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "stopMilling", null);
__decorate([
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'PLANT_MANAGER'),
    (0, common_1.Post)('milling/:id/log'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_production_log_dto_1.CreateProductionLogDto]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "addProductionLog", null);
__decorate([
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'PLANT_MANAGER'),
    (0, common_1.Post)('milling/:id/loss'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_process_loss_dto_1.CreateProcessLossDto]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "addProcessLoss", null);
__decorate([
    (0, common_1.Get)('batches/:id/yield'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "getBatchYield", null);
__decorate([
    (0, common_1.Get)('plants/:plantId/batches'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "findAllBatches", null);
__decorate([
    (0, common_1.Get)('plants/:plantId/yield'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "getPlantYieldAnalytics", null);
exports.ProductionController = ProductionController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('production'),
    __metadata("design:paramtypes", [production_service_1.ProductionService])
], ProductionController);
//# sourceMappingURL=production.controller.js.map
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
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const plant_context_guard_1 = require("../common/guards/plant-context.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
let ProductionController = class ProductionController {
    constructor(productionService) {
        this.productionService = productionService;
    }
    getMetrics(plantId) {
        return this.productionService.getMetrics(plantId);
    }
    getBatches(plantId, status, dateFrom, dateTo) {
        return this.productionService.getBatches(plantId, status, dateFrom, dateTo);
    }
    createBatch(createBatchDto) {
        return this.productionService.createBatch(createBatchDto);
    }
    completeBatch(data, id) {
        return this.productionService.completeBatch(id, data);
    }
};
exports.ProductionController = ProductionController;
__decorate([
    (0, common_1.Get)('metrics'),
    (0, require_permission_decorator_1.RequirePermission)('Production', 'canView'),
    __param(0, (0, common_1.Query)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('batches'),
    (0, require_permission_decorator_1.RequirePermission)('Production', 'canView'),
    __param(0, (0, common_1.Query)('plantId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('dateFrom')),
    __param(3, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "getBatches", null);
__decorate([
    (0, common_1.Post)('batches'),
    (0, require_permission_decorator_1.RequirePermission)('Production', 'canAdd'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_batch_dto_1.CreateBatchDto]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "createBatch", null);
__decorate([
    (0, common_1.Post)('batches/:id/complete'),
    (0, require_permission_decorator_1.RequirePermission)('Production', 'canEdit'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProductionController.prototype, "completeBatch", null);
exports.ProductionController = ProductionController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, plant_context_guard_1.PlantContextGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('production'),
    __metadata("design:paramtypes", [production_service_1.ProductionService])
], ProductionController);
//# sourceMappingURL=production.controller.js.map
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
exports.YieldController = void 0;
const common_1 = require("@nestjs/common");
const yield_service_1 = require("./yield.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const plant_context_guard_1 = require("../common/guards/plant-context.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
let YieldController = class YieldController {
    constructor(yieldService) {
        this.yieldService = yieldService;
    }
    saveCalculatorData(data, plantId) {
        return this.yieldService.saveCalculatorData(plantId, data);
    }
    getAnalytics(plantId) {
        return this.yieldService.getAnalytics(plantId);
    }
    getHistorical(plantId, dateFrom, dateTo, variety) {
        return this.yieldService.getHistorical(plantId, dateFrom, dateTo, variety);
    }
};
exports.YieldController = YieldController;
__decorate([
    (0, common_1.Post)('calculator/save'),
    (0, require_permission_decorator_1.RequirePermission)('Yield', 'canAdd'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], YieldController.prototype, "saveCalculatorData", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, require_permission_decorator_1.RequirePermission)('Yield', 'canView'),
    __param(0, (0, common_1.Query)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], YieldController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('historical'),
    (0, require_permission_decorator_1.RequirePermission)('Yield', 'canView'),
    __param(0, (0, common_1.Query)('plantId')),
    __param(1, (0, common_1.Query)('dateFrom')),
    __param(2, (0, common_1.Query)('dateTo')),
    __param(3, (0, common_1.Query)('variety')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], YieldController.prototype, "getHistorical", null);
exports.YieldController = YieldController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, plant_context_guard_1.PlantContextGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('yield'),
    __metadata("design:paramtypes", [yield_service_1.YieldService])
], YieldController);
//# sourceMappingURL=yield.controller.js.map
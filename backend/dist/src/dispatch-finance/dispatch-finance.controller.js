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
exports.DispatchFinanceController = void 0;
const common_1 = require("@nestjs/common");
const dispatch_finance_service_1 = require("./dispatch-finance.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let DispatchFinanceController = class DispatchFinanceController {
    constructor(dispatchFinanceService) {
        this.dispatchFinanceService = dispatchFinanceService;
    }
    getDispatchMetrics(plantId) {
        return this.dispatchFinanceService.getDispatchMetrics(plantId);
    }
    getAllDispatches(plantId) {
        return this.dispatchFinanceService.getAllDispatches(plantId);
    }
    createDispatch(plantId, data) {
        return this.dispatchFinanceService.createDispatch(plantId, data);
    }
    generateGatePass(plantId, data) {
        return this.dispatchFinanceService.generateGatePass(plantId, data);
    }
    getVehicleAllocationStats(plantId) {
        return this.dispatchFinanceService.getVehicleAllocationStats(plantId);
    }
    getFinanceOverview(plantId) {
        return this.dispatchFinanceService.getFinanceOverview(plantId);
    }
    getSystemUtilities(plantId) {
        return this.dispatchFinanceService.getSystemUtilities(plantId);
    }
    getWeightVerifications(plantId) {
        return this.dispatchFinanceService.getWeightVerifications(plantId);
    }
    getInventoryDeductions(plantId) {
        return this.dispatchFinanceService.getInventoryDeductions(plantId);
    }
    readWeighbridge(plantId) {
        return this.dispatchFinanceService.readWeighbridge(plantId);
    }
    createWeightEntry(plantId, data) {
        return this.dispatchFinanceService.createWeightEntry(plantId, data);
    }
};
exports.DispatchFinanceController = DispatchFinanceController;
__decorate([
    (0, common_1.Get)('metrics/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "getDispatchMetrics", null);
__decorate([
    (0, common_1.Get)('list/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "getAllDispatches", null);
__decorate([
    (0, common_1.Post)(':plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "createDispatch", null);
__decorate([
    (0, common_1.Post)('gate-pass/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "generateGatePass", null);
__decorate([
    (0, common_1.Get)('vehicle-allocation/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "getVehicleAllocationStats", null);
__decorate([
    (0, common_1.Get)('finance-overview/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "getFinanceOverview", null);
__decorate([
    (0, common_1.Get)('utilities/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "getSystemUtilities", null);
__decorate([
    (0, common_1.Get)('weight-verifications/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "getWeightVerifications", null);
__decorate([
    (0, common_1.Get)('inventory-deductions/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "getInventoryDeductions", null);
__decorate([
    (0, common_1.Get)('read-weighbridge/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "readWeighbridge", null);
__decorate([
    (0, common_1.Post)('weight-entry/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DispatchFinanceController.prototype, "createWeightEntry", null);
exports.DispatchFinanceController = DispatchFinanceController = __decorate([
    (0, common_1.Controller)('dispatch-finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dispatch_finance_service_1.DispatchFinanceService])
], DispatchFinanceController);
//# sourceMappingURL=dispatch-finance.controller.js.map
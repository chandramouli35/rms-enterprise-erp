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
exports.ProcurementController = void 0;
const common_1 = require("@nestjs/common");
const procurement_service_1 = require("./procurement.service");
let ProcurementController = class ProcurementController {
    constructor(procurementService) {
        this.procurementService = procurementService;
    }
    async savePurchase(data) {
        try {
            return await this.procurementService.savePurchase(data);
        }
        catch (error) {
            console.error(error);
            throw new common_1.HttpException(`Failed to save: ${error.message || error}`, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    getRecentPurchases(plantId) {
        return this.procurementService.getRecentPurchases(plantId);
    }
    getBatch(batchId) {
        return this.procurementService.getBatch(batchId);
    }
    updateQuality(batchId, data) {
        return this.procurementService.updateQuality(batchId, data);
    }
    getSuppliers() {
        return this.procurementService.getSuppliers();
    }
    createSupplier(data) {
        return this.procurementService.createSupplier(data);
    }
    getAnalytics(plantId) {
        return this.procurementService.getAnalytics(plantId);
    }
    getPurchaseRegister(plantId, filters) {
        return this.procurementService.getPurchaseRegister(plantId, filters);
    }
    async updateBoliRate(batchId, data) {
        try {
            return await this.procurementService.updateBoliRate(batchId, data.newRate, data.arhtiaCorrection);
        }
        catch (error) {
            throw new common_1.HttpException(error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    getSodaPending(plantId) {
        return this.procurementService.getSodaPending(plantId);
    }
};
exports.ProcurementController = ProcurementController;
__decorate([
    (0, common_1.Post)('save-purchase'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "savePurchase", null);
__decorate([
    (0, common_1.Get)('recent/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "getRecentPurchases", null);
__decorate([
    (0, common_1.Get)('batch/:batchId'),
    __param(0, (0, common_1.Param)('batchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "getBatch", null);
__decorate([
    (0, common_1.Post)('quality/:batchId'),
    __param(0, (0, common_1.Param)('batchId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "updateQuality", null);
__decorate([
    (0, common_1.Get)('suppliers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "getSuppliers", null);
__decorate([
    (0, common_1.Post)('suppliers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Get)('analytics/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)('register/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "getPurchaseRegister", null);
__decorate([
    (0, common_1.Post)('boli-rate/:batchId'),
    __param(0, (0, common_1.Param)('batchId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "updateBoliRate", null);
__decorate([
    (0, common_1.Get)('soda-pending/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProcurementController.prototype, "getSodaPending", null);
exports.ProcurementController = ProcurementController = __decorate([
    (0, common_1.Controller)('api/procurement'),
    __metadata("design:paramtypes", [procurement_service_1.ProcurementService])
], ProcurementController);
//# sourceMappingURL=procurement.controller.js.map
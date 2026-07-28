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
exports.PowerManagementController = void 0;
const common_1 = require("@nestjs/common");
const power_management_service_1 = require("./power-management.service");
let PowerManagementController = class PowerManagementController {
    constructor(powerManagementService) {
        this.powerManagementService = powerManagementService;
    }
    getPlantId(headers) {
        const plantId = headers['x-plant-id'];
        if (!plantId) {
            throw new common_1.HttpException('Plant ID is required', common_1.HttpStatus.BAD_REQUEST);
        }
        return plantId;
    }
    getDashboard(headers) {
        return this.powerManagementService.getDashboard(this.getPlantId(headers));
    }
    getSources(headers) {
        return this.powerManagementService.getSources(this.getPlantId(headers));
    }
    getTrend(headers) {
        return this.powerManagementService.getTrend(this.getPlantId(headers));
    }
    getLoadDistribution(headers) {
        return this.powerManagementService.getLoadDistribution(this.getPlantId(headers));
    }
    getAlerts(headers) {
        return this.powerManagementService.getAlerts(this.getPlantId(headers));
    }
    getSettings(headers) {
        return this.powerManagementService.getSettings(this.getPlantId(headers));
    }
    updateSettings(headers, data) {
        return this.powerManagementService.updateSettings(this.getPlantId(headers), data);
    }
    seedData(headers) {
        return this.powerManagementService.seedMockData(this.getPlantId(headers));
    }
};
exports.PowerManagementController = PowerManagementController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('sources'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "getSources", null);
__decorate([
    (0, common_1.Get)('trend'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "getTrend", null);
__decorate([
    (0, common_1.Get)('load'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "getLoadDistribution", null);
__decorate([
    (0, common_1.Get)('alerts'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Get)('settings'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)('seed'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PowerManagementController.prototype, "seedData", null);
exports.PowerManagementController = PowerManagementController = __decorate([
    (0, common_1.Controller)('power-management'),
    __metadata("design:paramtypes", [power_management_service_1.PowerManagementService])
], PowerManagementController);
//# sourceMappingURL=power-management.controller.js.map
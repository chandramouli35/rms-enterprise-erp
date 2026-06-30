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
let WeighbridgeController = class WeighbridgeController {
    constructor(weighbridgeService) {
        this.weighbridgeService = weighbridgeService;
    }
    streamWeight(vehicleNo) {
        return this.weighbridgeService.streamWeight(vehicleNo);
    }
    saveTransaction(data) {
        return this.weighbridgeService.saveTransaction(data);
    }
    getHistory(plantId) {
        return this.weighbridgeService.getHistory(plantId);
    }
    getSettings(plantId) {
        return this.weighbridgeService.getSettings(plantId);
    }
    updateSettings(plantId, data) {
        return this.weighbridgeService.updateSettings(plantId, data);
    }
};
exports.WeighbridgeController = WeighbridgeController;
__decorate([
    (0, common_1.Get)('stream/:vehicleNo'),
    __param(0, (0, common_1.Param)('vehicleNo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WeighbridgeController.prototype, "streamWeight", null);
__decorate([
    (0, common_1.Post)('save-transaction'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WeighbridgeController.prototype, "saveTransaction", null);
__decorate([
    (0, common_1.Get)('history/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WeighbridgeController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('settings/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WeighbridgeController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WeighbridgeController.prototype, "updateSettings", null);
exports.WeighbridgeController = WeighbridgeController = __decorate([
    (0, common_1.Controller)('api/weighbridge'),
    __metadata("design:paramtypes", [weighbridge_service_1.WeighbridgeService])
], WeighbridgeController);
//# sourceMappingURL=weighbridge.controller.js.map
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
exports.TransferController = void 0;
const common_1 = require("@nestjs/common");
const transfer_service_1 = require("./transfer.service");
const create_transfer_dto_1 = require("./dto/create-transfer.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const plant_context_guard_1 = require("../common/guards/plant-context.guard");
let TransferController = class TransferController {
    constructor(transferService) {
        this.transferService = transferService;
    }
    getMetrics(plantId) {
        return this.transferService.getMetrics(plantId);
    }
    getAllTransfers(plantId) {
        return this.transferService.getAllTransfers(plantId);
    }
    createTransfer(createTransferDto) {
        return this.transferService.createTransfer(createTransferDto);
    }
    updateStatus(id, updateStatusDto) {
        return this.transferService.updateStatus(id, updateStatusDto);
    }
};
exports.TransferController = TransferController;
__decorate([
    (0, common_1.Get)('metrics'),
    __param(0, (0, common_1.Query)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransferController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransferController.prototype, "getAllTransfers", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_transfer_dto_1.CreateTransferDto]),
    __metadata("design:returntype", void 0)
], TransferController.prototype, "createTransfer", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_transfer_dto_1.UpdateTransferStatusDto]),
    __metadata("design:returntype", void 0)
], TransferController.prototype, "updateStatus", null);
exports.TransferController = TransferController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, plant_context_guard_1.PlantContextGuard),
    (0, common_1.Controller)('transfer'),
    __metadata("design:paramtypes", [transfer_service_1.TransferService])
], TransferController);
//# sourceMappingURL=transfer.controller.js.map
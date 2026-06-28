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
exports.TransfersController = void 0;
const common_1 = require("@nestjs/common");
const transfers_service_1 = require("./transfers.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let TransfersController = class TransfersController {
    constructor(transfersService) {
        this.transfersService = transfersService;
    }
    initiateTransfer(dto, req) {
        return this.transfersService.initiateTransfer(dto, req.user.userId);
    }
    receiveTransfer(id, itemCategory, req) {
        return this.transfersService.receiveTransfer(id, req.user.userId, itemCategory);
    }
    getTransfersForPlant(plantId) {
        return this.transfersService.getTransfersForPlant(plantId);
    }
};
exports.TransfersController = TransfersController;
__decorate([
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'PLANT_MANAGER'),
    (0, common_1.Post)('initiate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transfers_service_1.CreateTransferDto, Object]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "initiateTransfer", null);
__decorate([
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'PLANT_MANAGER'),
    (0, common_1.Post)(':id/receive'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('itemCategory')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "receiveTransfer", null);
__decorate([
    (0, common_1.Get)('plants/:plantId'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransfersController.prototype, "getTransfersForPlant", null);
exports.TransfersController = TransfersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('transfers'),
    __metadata("design:paramtypes", [transfers_service_1.TransfersService])
], TransfersController);
//# sourceMappingURL=transfers.controller.js.map
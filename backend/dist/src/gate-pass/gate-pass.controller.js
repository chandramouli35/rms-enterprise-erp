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
exports.GatePassController = void 0;
const common_1 = require("@nestjs/common");
const gate_pass_service_1 = require("./gate-pass.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
let GatePassController = class GatePassController {
    constructor(gatePassService) {
        this.gatePassService = gatePassService;
    }
    generateGatePass(data) {
        return this.gatePassService.generateGatePass(data);
    }
    getCampusStatus(plantId) {
        return this.gatePassService.getCampusStatus(plantId);
    }
    getRecentGatePasses(plantId, type) {
        return this.gatePassService.getRecentGatePasses(plantId, type || 'INWARD');
    }
    getGatePassByQr(qrCode) {
        return this.gatePassService.getGatePassByQr(qrCode);
    }
    getAnalytics(plantId) {
        return this.gatePassService.getAnalytics(plantId);
    }
    getDuplicateLogs(plantId) {
        return this.gatePassService.getDuplicateLogs(plantId);
    }
};
exports.GatePassController = GatePassController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, require_permission_decorator_1.RequirePermission)('Gate Pass', 'canAdd'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GatePassController.prototype, "generateGatePass", null);
__decorate([
    (0, common_1.Get)('campus-status/:plantId'),
    (0, require_permission_decorator_1.RequirePermission)('Gate Pass', 'canView'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GatePassController.prototype, "getCampusStatus", null);
__decorate([
    (0, common_1.Get)('recent/:plantId'),
    (0, require_permission_decorator_1.RequirePermission)('Gate Pass', 'canView'),
    __param(0, (0, common_1.Param)('plantId')),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], GatePassController.prototype, "getRecentGatePasses", null);
__decorate([
    (0, common_1.Get)('scan/:qrCode'),
    (0, require_permission_decorator_1.RequirePermission)('Gate Pass', 'canView'),
    __param(0, (0, common_1.Param)('qrCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GatePassController.prototype, "getGatePassByQr", null);
__decorate([
    (0, common_1.Get)('analytics/:plantId'),
    (0, require_permission_decorator_1.RequirePermission)('Gate Pass', 'canView'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GatePassController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('duplicate-logs/:plantId'),
    (0, require_permission_decorator_1.RequirePermission)('Gate Pass', 'canView'),
    __param(0, (0, common_1.Param)('plantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GatePassController.prototype, "getDuplicateLogs", null);
exports.GatePassController = GatePassController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('api/gate-pass'),
    __metadata("design:paramtypes", [gate_pass_service_1.GatePassService])
], GatePassController);
//# sourceMappingURL=gate-pass.controller.js.map
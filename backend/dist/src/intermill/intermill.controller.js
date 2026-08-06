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
exports.IntermillController = void 0;
const common_1 = require("@nestjs/common");
const intermill_service_1 = require("./intermill.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let IntermillController = class IntermillController {
    constructor(intermillService) {
        this.intermillService = intermillService;
    }
    create(req, createIntermillDto) {
        const user = req.user;
        return this.intermillService.create(createIntermillDto, user);
    }
    findAll(req) {
        const user = req.user;
        return this.intermillService.findAll(user);
    }
    approve(id, req) {
        const user = req.user;
        return this.intermillService.approve(id, user);
    }
};
exports.IntermillController = IntermillController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], IntermillController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntermillController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], IntermillController.prototype, "approve", null);
exports.IntermillController = IntermillController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/production/intermill'),
    __metadata("design:paramtypes", [intermill_service_1.IntermillService])
], IntermillController);
//# sourceMappingURL=intermill.controller.js.map
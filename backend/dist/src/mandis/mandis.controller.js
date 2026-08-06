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
exports.MandisController = void 0;
const common_1 = require("@nestjs/common");
const mandis_service_1 = require("./mandis.service");
const create_mandi_dto_1 = require("./dto/create-mandi.dto");
const update_mandi_dto_1 = require("./dto/update-mandi.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let MandisController = class MandisController {
    constructor(mandisService) {
        this.mandisService = mandisService;
    }
    create(createMandiDto) {
        return this.mandisService.create(createMandiDto);
    }
    findAll() {
        return this.mandisService.findAll();
    }
    findOne(id) {
        return this.mandisService.findOne(id);
    }
    update(id, updateMandiDto) {
        return this.mandisService.update(id, updateMandiDto);
    }
    remove(id) {
        return this.mandisService.remove(id);
    }
};
exports.MandisController = MandisController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mandi_dto_1.CreateMandiDto]),
    __metadata("design:returntype", void 0)
], MandisController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MandisController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MandisController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_mandi_dto_1.UpdateMandiDto]),
    __metadata("design:returntype", void 0)
], MandisController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MandisController.prototype, "remove", null);
exports.MandisController = MandisController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/mandis'),
    __metadata("design:paramtypes", [mandis_service_1.MandisService])
], MandisController);
//# sourceMappingURL=mandis.controller.js.map
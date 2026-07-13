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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const require_permission_decorator_1 = require("../common/decorators/require-permission.decorator");
const inventory_service_1 = require("./inventory.service");
const inventory_dto_1 = require("./dto/inventory.dto");
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    getDashboardSummary(req, itemType) {
        const plantId = req.user.plantId;
        return this.inventoryService.getDashboardSummary(plantId, itemType);
    }
    getInventoryList(req, filterDto) {
        const plantId = req.user.plantId;
        return this.inventoryService.getInventoryList(plantId, filterDto);
    }
    getStockReport(req, filterDto) {
        const plantId = req.user.plantId;
        return this.inventoryService.getStockReport(plantId, filterDto);
    }
    adjustStock(req, body) {
        const plantId = req.user.plantId;
        return this.inventoryService.adjustStock({ ...body, plantId });
    }
    getLedger(req, filterDto) {
        const plantId = req.user.plantId;
        return this.inventoryService.getLedger(plantId, filterDto);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, require_permission_decorator_1.RequirePermission)('Inventory', 'canView'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('itemType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)(),
    (0, require_permission_decorator_1.RequirePermission)('Inventory', 'canView'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, inventory_dto_1.GetInventoryFilterDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getInventoryList", null);
__decorate([
    (0, common_1.Get)('stock-report'),
    (0, require_permission_decorator_1.RequirePermission)('Inventory', 'canView'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, inventory_dto_1.GetStockReportDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getStockReport", null);
__decorate([
    (0, common_1.Post)('adjustment'),
    (0, require_permission_decorator_1.RequirePermission)('Inventory', 'canEdit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "adjustStock", null);
__decorate([
    (0, common_1.Get)('ledger'),
    (0, require_permission_decorator_1.RequirePermission)('Inventory', 'canView'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getLedger", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map
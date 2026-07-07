"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const plants_module_1 = require("./plants/plants.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const users_module_1 = require("./users/users.module");
const users_roles_module_1 = require("./users-roles/users-roles.module");
const procurement_module_1 = require("./procurement/procurement.module");
const weighbridge_module_1 = require("./weighbridge/weighbridge.module");
const gate_pass_module_1 = require("./gate-pass/gate-pass.module");
const production_module_1 = require("./production/production.module");
const yield_module_1 = require("./yield/yield.module");
const inventory_module_1 = require("./inventory/inventory.module");
const transfer_module_1 = require("./transfer/transfer.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, auth_module_1.AuthModule, plants_module_1.PlantsModule, dashboard_module_1.DashboardModule, users_module_1.UsersModule, users_roles_module_1.UsersRolesModule, procurement_module_1.ProcurementModule, weighbridge_module_1.WeighbridgeModule, gate_pass_module_1.GatePassModule, production_module_1.ProductionModule, yield_module_1.YieldModule, inventory_module_1.InventoryModule, transfer_module_1.TransferModule],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
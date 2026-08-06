"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntermillModule = void 0;
const common_1 = require("@nestjs/common");
const intermill_service_1 = require("./intermill.service");
const intermill_controller_1 = require("./intermill.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const inventory_module_1 = require("../inventory/inventory.module");
let IntermillModule = class IntermillModule {
};
exports.IntermillModule = IntermillModule;
exports.IntermillModule = IntermillModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, inventory_module_1.InventoryModule],
        controllers: [intermill_controller_1.IntermillController],
        providers: [intermill_service_1.IntermillService],
    })
], IntermillModule);
//# sourceMappingURL=intermill.module.js.map
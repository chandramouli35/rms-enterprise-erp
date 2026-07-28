"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerManagementModule = void 0;
const common_1 = require("@nestjs/common");
const power_management_service_1 = require("./power-management.service");
const power_management_controller_1 = require("./power-management.controller");
let PowerManagementModule = class PowerManagementModule {
};
exports.PowerManagementModule = PowerManagementModule;
exports.PowerManagementModule = PowerManagementModule = __decorate([
    (0, common_1.Module)({
        providers: [power_management_service_1.PowerManagementService],
        controllers: [power_management_controller_1.PowerManagementController]
    })
], PowerManagementModule);
//# sourceMappingURL=power-management.module.js.map
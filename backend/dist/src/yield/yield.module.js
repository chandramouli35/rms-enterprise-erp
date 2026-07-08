"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YieldModule = void 0;
const common_1 = require("@nestjs/common");
const yield_service_1 = require("./yield.service");
const yield_controller_1 = require("./yield.controller");
let YieldModule = class YieldModule {
};
exports.YieldModule = YieldModule;
exports.YieldModule = YieldModule = __decorate([
    (0, common_1.Module)({
        providers: [yield_service_1.YieldService],
        controllers: [yield_controller_1.YieldController]
    })
], YieldModule);
//# sourceMappingURL=yield.module.js.map
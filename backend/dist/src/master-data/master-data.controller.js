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
exports.MasterDataController = void 0;
const common_1 = require("@nestjs/common");
const master_data_service_1 = require("./master-data.service");
let MasterDataController = class MasterDataController {
    constructor(masterDataService) {
        this.masterDataService = masterDataService;
    }
    extractPlantId(headers) {
        const plantId = headers['x-plant-id'];
        if (!plantId) {
            throw new common_1.BadRequestException('Plant ID is required');
        }
        return plantId;
    }
    async getTrucks(headers, page, limit) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.getTrucks(plantId, page, limit);
    }
    async getAllTrucks(headers, page, limit) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.getAllTrucks(plantId, page, limit);
    }
    async createTruck(headers, data) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.createTruck(plantId, data);
    }
    async approveTruck(id) {
        return this.masterDataService.approveTruck(id);
    }
    async rejectTruck(id) {
        return this.masterDataService.rejectTruck(id);
    }
    async deleteTruck(id) {
        return this.masterDataService.deleteTruck(id);
    }
    async getDrivers(headers) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.getDrivers(plantId);
    }
    async createDriver(headers, data) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.createDriver(plantId, data);
    }
    async deleteDriver(id) {
        return this.masterDataService.deleteDriver(id);
    }
    async getStaff(headers) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.getStaff(plantId);
    }
    async createStaff(headers, data) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.createStaff(plantId, data);
    }
    async deleteStaff(id) {
        return this.masterDataService.deleteStaff(id);
    }
    async getLabour(headers, page, limit) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.getLabour(plantId, page, limit);
    }
    async createLabour(headers, data) {
        const plantId = this.extractPlantId(headers);
        return this.masterDataService.createLabour(plantId, data);
    }
    async deleteLabour(id) {
        return this.masterDataService.deleteLabour(id);
    }
};
exports.MasterDataController = MasterDataController;
__decorate([
    (0, common_1.Get)('trucks'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getTrucks", null);
__decorate([
    (0, common_1.Get)('trucks/all'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getAllTrucks", null);
__decorate([
    (0, common_1.Post)('trucks'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createTruck", null);
__decorate([
    (0, common_1.Put)('trucks/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "approveTruck", null);
__decorate([
    (0, common_1.Put)('trucks/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "rejectTruck", null);
__decorate([
    (0, common_1.Delete)('trucks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "deleteTruck", null);
__decorate([
    (0, common_1.Get)('drivers'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getDrivers", null);
__decorate([
    (0, common_1.Post)('drivers'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createDriver", null);
__decorate([
    (0, common_1.Delete)('drivers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "deleteDriver", null);
__decorate([
    (0, common_1.Get)('staff'),
    __param(0, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getStaff", null);
__decorate([
    (0, common_1.Post)('staff'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createStaff", null);
__decorate([
    (0, common_1.Delete)('staff/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "deleteStaff", null);
__decorate([
    (0, common_1.Get)('labour'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getLabour", null);
__decorate([
    (0, common_1.Post)('labour'),
    __param(0, (0, common_1.Headers)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createLabour", null);
__decorate([
    (0, common_1.Delete)('labour/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "deleteLabour", null);
exports.MasterDataController = MasterDataController = __decorate([
    (0, common_1.Controller)('api/master-data'),
    __metadata("design:paramtypes", [master_data_service_1.MasterDataService])
], MasterDataController);
//# sourceMappingURL=master-data.controller.js.map
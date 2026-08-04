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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterDataService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MasterDataService = class MasterDataService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTrucks(plantId) {
        return this.prisma.truckMaster.findMany({ where: { plantId, isApproved: true }, orderBy: { truckNumber: 'asc' } });
    }
    async getAllTrucks(plantId) {
        return this.prisma.truckMaster.findMany({ where: { plantId }, orderBy: { createdAt: 'desc' } });
    }
    async createTruck(plantId, data) {
        return this.prisma.truckMaster.create({
            data: { plantId, ...data }
        });
    }
    async approveTruck(id) {
        return this.prisma.truckMaster.update({
            where: { id },
            data: { isApproved: true }
        });
    }
    async rejectTruck(id) {
        return this.prisma.truckMaster.delete({
            where: { id }
        });
    }
    async deleteTruck(id) {
        return this.prisma.truckMaster.delete({ where: { id } });
    }
    async getDrivers(plantId) {
        return this.prisma.driverMaster.findMany({ where: { plantId }, orderBy: { name: 'asc' } });
    }
    async createDriver(plantId, data) {
        return this.prisma.driverMaster.create({
            data: { plantId, ...data }
        });
    }
    async deleteDriver(id) {
        return this.prisma.driverMaster.delete({ where: { id } });
    }
    async getStaff(plantId) {
        return this.prisma.staffMaster.findMany({ where: { plantId }, orderBy: { name: 'asc' } });
    }
    async createStaff(plantId, data) {
        return this.prisma.staffMaster.create({
            data: { plantId, ...data }
        });
    }
    async deleteStaff(id) {
        return this.prisma.staffMaster.delete({ where: { id } });
    }
    async getLabour(plantId) {
        return this.prisma.labourMaster.findMany({ where: { plantId, isActive: true }, orderBy: { name: 'asc' } });
    }
    async createLabour(plantId, data) {
        return this.prisma.labourMaster.create({
            data: { plantId, ...data }
        });
    }
    async deleteLabour(id) {
        return this.prisma.labourMaster.delete({ where: { id } });
    }
};
exports.MasterDataService = MasterDataService;
exports.MasterDataService = MasterDataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MasterDataService);
//# sourceMappingURL=master-data.service.js.map
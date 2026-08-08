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
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
let MasterDataService = class MasterDataService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async uploadImageToCloudinary(file) {
        if (!file)
            return null;
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({ folder: 'trucks' }, (error, result) => {
                if (error)
                    return reject(error);
                resolve(result?.secure_url || null);
            });
            const readableStream = new stream_1.Readable();
            readableStream.push(file.buffer);
            readableStream.push(null);
            readableStream.pipe(uploadStream);
        });
    }
    async getTrucks(plantId, page, limit) {
        const where = { plantId, isApproved: true };
        if (page) {
            const pageNum = parseInt(page || '1', 10);
            const limitNum = parseInt(limit || '10', 10);
            const skip = (pageNum - 1) * limitNum;
            const [total, data] = await this.prisma.$transaction([
                this.prisma.truckMaster.count({ where }),
                this.prisma.truckMaster.findMany({ where, orderBy: { truckNumber: 'asc' }, skip, take: limitNum })
            ]);
            return { data, total };
        }
        return this.prisma.truckMaster.findMany({ where, orderBy: { truckNumber: 'asc' } });
    }
    async getAllTrucks(plantId, page, limit) {
        const where = { plantId };
        if (page) {
            const pageNum = parseInt(page || '1', 10);
            const limitNum = parseInt(limit || '10', 10);
            const skip = (pageNum - 1) * limitNum;
            const [total, data] = await this.prisma.$transaction([
                this.prisma.truckMaster.count({ where }),
                this.prisma.truckMaster.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum })
            ]);
            return { data, total };
        }
        return this.prisma.truckMaster.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
    async createTruck(plantId, data, file) {
        const existing = await this.prisma.truckMaster.findFirst({
            where: { plantId, truckNumber: data.truckNumber }
        });
        if (existing) {
            const { BadRequestException } = require('@nestjs/common');
            throw new BadRequestException(`Truck number ${data.truckNumber} already exists in this plant`);
        }
        let imageUrl = null;
        if (file) {
            imageUrl = await this.uploadImageToCloudinary(file);
        }
        const capacityNum = data.capacity ? Number(data.capacity) : undefined;
        const isApprovedBool = typeof data.isApproved === 'string' ? data.isApproved === 'true' : data.isApproved;
        return this.prisma.truckMaster.create({
            data: {
                plantId,
                truckNumber: data.truckNumber,
                capacity: capacityNum,
                isApproved: isApprovedBool,
                imageUrl
            }
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
    async getLabour(plantId, page, limit) {
        const where = { plantId, isActive: true };
        if (page) {
            const pageNum = parseInt(page || '1', 10);
            const limitNum = parseInt(limit || '10', 10);
            const skip = (pageNum - 1) * limitNum;
            const [total, data] = await this.prisma.$transaction([
                this.prisma.labourMaster.count({ where }),
                this.prisma.labourMaster.findMany({ where, orderBy: { name: 'asc' }, skip, take: limitNum })
            ]);
            return { data, total };
        }
        return this.prisma.labourMaster.findMany({ where, orderBy: { name: 'asc' } });
    }
    async createLabour(plantId, data) {
        return this.prisma.labourMaster.create({
            data: { plantId, ...data }
        });
    }
    async deleteLabour(id) {
        return this.prisma.labourMaster.update({
            where: { id },
            data: { isActive: false }
        });
    }
    async getPahunch(plantId, page, limit) {
        const where = { plantId, isActive: true };
        if (page) {
            const pageNum = parseInt(page || '1', 10);
            const limitNum = parseInt(limit || '10', 10);
            const skip = (pageNum - 1) * limitNum;
            const [total, data] = await this.prisma.$transaction([
                this.prisma.pahunchMaster.count({ where }),
                this.prisma.pahunchMaster.findMany({ where, orderBy: { name: 'asc' }, skip, take: limitNum })
            ]);
            return { data, total };
        }
        return this.prisma.pahunchMaster.findMany({ where, orderBy: { name: 'asc' } });
    }
    async createPahunch(plantId, data) {
        return this.prisma.pahunchMaster.create({
            data: { plantId, ...data }
        });
    }
    async deletePahunch(id) {
        return this.prisma.pahunchMaster.update({
            where: { id },
            data: { isActive: false }
        });
    }
};
exports.MasterDataService = MasterDataService;
exports.MasterDataService = MasterDataService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MasterDataService);
//# sourceMappingURL=master-data.service.js.map
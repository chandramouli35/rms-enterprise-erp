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
exports.PlantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PlantsService = class PlantsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(page, limit) {
        if (page) {
            const pageNum = parseInt(page || '1', 10);
            const limitNum = parseInt(limit || '10', 10);
            const skip = (pageNum - 1) * limitNum;
            const [total, data] = await this.prisma.$transaction([
                this.prisma.plant.count(),
                this.prisma.plant.findMany({
                    orderBy: { name: 'asc' },
                    skip,
                    take: limitNum
                })
            ]);
            return { data, total };
        }
        return this.prisma.plant.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async create(data) {
        return this.prisma.plant.create({
            data: {
                name: data.name,
                code: data.code,
                location: data.location,
                standardBagWeight: data.standardBagWeight ? parseFloat(data.standardBagWeight) : 0.382,
                aClassBagWeight: data.aClassBagWeight ? parseFloat(data.aClassBagWeight) : 0.380,
                bClassBagWeight: data.bClassBagWeight ? parseFloat(data.bClassBagWeight) : 0.385
            },
        });
    }
    async update(id, data) {
        return this.prisma.plant.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.code && { code: data.code }),
                ...(data.location && { location: data.location }),
                ...(data.standardBagWeight && { standardBagWeight: parseFloat(data.standardBagWeight) }),
                ...(data.aClassBagWeight && { aClassBagWeight: parseFloat(data.aClassBagWeight) }),
                ...(data.bClassBagWeight && { bClassBagWeight: parseFloat(data.bClassBagWeight) }),
            },
        });
    }
};
exports.PlantsService = PlantsService;
exports.PlantsService = PlantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlantsService);
//# sourceMappingURL=plants.service.js.map
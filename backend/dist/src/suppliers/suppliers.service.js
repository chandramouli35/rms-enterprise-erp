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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SuppliersService = class SuppliersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(plantId, page = 1, limit = 10, search) {
        const skip = (page - 1) * limit;
        const where = {
            plantId,
            deletedAt: null
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [total, data] = await this.prisma.$transaction([
            this.prisma.supplier.count({ where }),
            this.prisma.supplier.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
            })
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async create(plantId, data) {
        return this.prisma.supplier.create({
            data: {
                ...data,
                plantId,
            },
        });
    }
    async update(plantId, id, data) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id, plantId, deletedAt: null },
        });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        return this.prisma.supplier.update({
            where: { id },
            data,
        });
    }
    async remove(plantId, id) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id, plantId, deletedAt: null },
        });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        return this.prisma.supplier.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map
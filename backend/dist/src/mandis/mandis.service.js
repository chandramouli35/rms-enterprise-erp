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
exports.MandisService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MandisService = class MandisService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createMandiDto) {
        const existingMandi = await this.prisma.mandi.findUnique({
            where: { name: createMandiDto.name }
        });
        if (existingMandi) {
            throw new common_1.ConflictException('Mandi with this name already exists');
        }
        return this.prisma.mandi.create({
            data: {
                name: createMandiDto.name,
                isActive: createMandiDto.isActive ?? true,
            }
        });
    }
    findAll() {
        return this.prisma.mandi.findMany({
            orderBy: { name: 'asc' }
        });
    }
    async findOne(id) {
        const mandi = await this.prisma.mandi.findUnique({
            where: { id }
        });
        if (!mandi) {
            throw new common_1.NotFoundException('Mandi not found');
        }
        return mandi;
    }
    async update(id, updateMandiDto) {
        await this.findOne(id);
        if (updateMandiDto.name) {
            const existingMandi = await this.prisma.mandi.findFirst({
                where: { name: updateMandiDto.name, NOT: { id } }
            });
            if (existingMandi) {
                throw new common_1.ConflictException('Mandi with this name already exists');
            }
        }
        return this.prisma.mandi.update({
            where: { id },
            data: updateMandiDto
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.mandi.delete({
            where: { id }
        });
    }
};
exports.MandisService = MandisService;
exports.MandisService = MandisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MandisService);
//# sourceMappingURL=mandis.service.js.map
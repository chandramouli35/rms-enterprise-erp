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
exports.PlantContextGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PlantContextGuard = class PlantContextGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const plantId = request.headers['x-plant-id'];
        if (!user) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        if (user.role?.name === 'SUPER_ADMIN') {
            return true;
        }
        if (!plantId || plantId === 'global') {
            throw new common_1.ForbiddenException('Missing or invalid x-plant-id header');
        }
        const access = await this.prisma.userPlantAccess.findUnique({
            where: {
                userId_plantId: {
                    userId: user.id,
                    plantId: plantId,
                }
            }
        });
        if (!access) {
            throw new common_1.ForbiddenException(`User does not have access to plant ${plantId}`);
        }
        return true;
    }
};
exports.PlantContextGuard = PlantContextGuard;
exports.PlantContextGuard = PlantContextGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlantContextGuard);
//# sourceMappingURL=plant-context.guard.js.map
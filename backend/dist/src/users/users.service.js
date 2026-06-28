"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(plantId, page = 1, limit = 10, search, role) {
        const skip = (page - 1) * limit;
        const where = {
            plantAccess: {
                some: { plantId }
            }
        };
        if (search) {
            where.username = { contains: search, mode: 'insensitive' };
        }
        if (role && role !== 'ALL') {
            where.role = { name: role };
        }
        const [total, users] = await this.prisma.$transaction([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                include: {
                    role: true,
                    plantAccess: {
                        include: { plant: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        return {
            data: users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role.name,
                plants: user.plantAccess.map(pa => pa.plant.name)
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async create(data, reqUser) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const role = await this.prisma.role.findUnique({ where: { name: data.role } });
        if (!role) {
            throw new common_1.ConflictException('Role not found');
        }
        const passwordHash = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                username: data.username,
                email: data.email,
                passwordHash,
                roleId: role.id,
                plantAccess: {
                    create: data.plantIds.map((id) => ({
                        plantId: id
                    }))
                }
            },
            include: {
                role: true,
                plantAccess: { include: { plant: true } }
            }
        });
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role.name,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map
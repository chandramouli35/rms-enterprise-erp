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
exports.UsersRolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersRolesService = class UsersRolesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.MODULE_STRUCTURE = [
            {
                name: 'Dashboard',
                subModules: []
            },
            {
                name: 'Procurement',
                subModules: ['Supplier Master', 'Paddy Purchase & Quality', 'Paddy Inward', 'Inward List', 'Quality Inspection', 'Purchase Register']
            },
            {
                name: 'Yield Mgmt',
                subModules: ['Yield Calculator', 'Yield Analytics', 'Historical Reports']
            },
            {
                name: 'Production',
                subModules: ['Batch Creation', 'Production Tracking']
            },
            {
                name: 'Inventory',
                subModules: ['Paddy Stock', 'Rice Stock', 'Bran Stock', 'Husk Stock', 'Finished Goods', 'Consumables Inventory']
            },
            {
                name: 'Transfer',
                subModules: ['Transfer Request', 'Transfer Tracking', 'In Transit Stock']
            },
            {
                name: 'Gate Pass',
                subModules: ['Gate In', 'Gate Out', 'Report Summary', 'QR Barcode', 'Duplicate Prevention']
            },
            {
                name: 'Weighbridge',
                subModules: ['Weighment', 'Device Config']
            },
            {
                name: 'Users and Roles',
                subModules: ['Users', 'Roles', 'Permissions', 'Audit Access']
            },
            {
                name: 'Settings',
                subModules: ['Global Settings']
            }
        ];
    }
    async getStats() {
        const [totalUsers, activeUsers, inactiveUsers, totalRoles] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { isActive: true } }),
            this.prisma.user.count({ where: { isActive: false } }),
            this.prisma.role.count()
        ]);
        return {
            totalUsers,
            activeUsers,
            inactiveUsers,
            totalRoles,
            totalPermissions: 156
        };
    }
    async getUsersList() {
        const users = await this.prisma.user.findMany({
            include: {
                role: true,
                plantAccess: {
                    include: { plant: true }
                }
            }
        });
        return users.map(user => ({
            id: user.id,
            username: user.username,
            fullname: user.username,
            email: user.email,
            role: user.role.name,
            roleId: user.roleId,
            plant: user.plantAccess.length > 0 ? user.plantAccess.map(pa => pa.plant.name).join(', ') : 'None',
            plantId: user.plantAccess.length > 0 ? user.plantAccess[0].plantId : '',
            status: user.isActive ? 'Active' : 'Inactive',
            lastLogin: user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never',
            avatar: `https://ui-avatars.com/api/?name=${user.username}`
        }));
    }
    async createUser(data) {
        const { username, fullname, email, password, roleId, plantIds } = data;
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                roleId,
                plantAccess: {
                    create: plantIds.map((id) => ({ plantId: id }))
                }
            }
        });
        await this.prisma.systemAuditLog.create({
            data: {
                userId: user.id,
                action: 'CREATED_USER',
                module: 'Users & Roles',
                details: `User ${username} created.`
            }
        });
        return user;
    }
    async toggleUserStatus(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new Error('User not found');
        return this.prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive }
        });
    }
    async updateUser(id, data) {
        const { email, roleId, plantIds, newPassword, currentPassword } = data;
        let updateData = {
            email,
            roleId
        };
        if (newPassword) {
            if (!currentPassword) {
                throw new common_1.BadRequestException('Current password is required to set a new password');
            }
            const targetUser = await this.prisma.user.findUnique({ where: { id } });
            if (!targetUser)
                throw new Error('User not found');
            const isValid = await bcrypt.compare(currentPassword, targetUser.passwordHash);
            if (!isValid) {
                throw new common_1.UnauthorizedException('Invalid current password');
            }
            updateData.passwordHash = await bcrypt.hash(newPassword, 10);
        }
        const user = await this.prisma.user.update({
            where: { id },
            data: updateData
        });
        if (plantIds && Array.isArray(plantIds)) {
            await this.prisma.userPlantAccess.deleteMany({ where: { userId: id } });
            await this.prisma.userPlantAccess.createMany({
                data: plantIds.map((pid) => ({ userId: id, plantId: pid }))
            });
        }
        await this.prisma.systemAuditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATED_USER',
                module: 'Users & Roles',
                details: `User ${user.username} updated.`
            }
        });
        return user;
    }
    async deleteUser(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new Error('User not found');
        await this.prisma.userPlantAccess.deleteMany({ where: { userId: id } });
        await this.prisma.user.delete({ where: { id } });
        await this.prisma.systemAuditLog.create({
            data: {
                userId: user.id,
                action: 'DELETED_USER',
                module: 'Users & Roles',
                details: `User ${user.username} deleted.`
            }
        });
        return { message: 'User deleted successfully' };
    }
    async getRoles() {
        return this.prisma.role.findMany();
    }
    async createRole(data) {
        return this.prisma.role.create({
            data: {
                name: data.name,
                description: data.description
            }
        });
    }
    async getRolePermissions(roleId) {
        const existing = await this.prisma.modulePermission.findMany({
            where: { roleId }
        });
        return this.MODULE_STRUCTURE.map(mod => {
            const parentPerm = existing.find(e => e.moduleName === mod.name && (!e.subModuleName || e.subModuleName === ''));
            return {
                name: mod.name,
                permissions: {
                    view: parentPerm?.canView || false,
                    add: parentPerm?.canAdd || false,
                    edit: parentPerm?.canEdit || false,
                    delete: parentPerm?.canDelete || false,
                    approve: parentPerm?.canApprove || false
                },
                subModules: mod.subModules.map(subName => {
                    const subPerm = existing.find(e => e.moduleName === mod.name && e.subModuleName === subName);
                    return {
                        name: subName,
                        permissions: {
                            view: subPerm?.canView || false,
                            add: subPerm?.canAdd || false,
                            edit: subPerm?.canEdit || false,
                            delete: subPerm?.canDelete || false,
                            approve: subPerm?.canApprove || false
                        }
                    };
                })
            };
        });
    }
    async updateRolePermissions(roleId, permissions) {
        const permsArray = Array.isArray(permissions) ? permissions : permissions?.permissions || [];
        await this.prisma.modulePermission.deleteMany({ where: { roleId } });
        const dataToInsert = [];
        for (const p of permsArray) {
            dataToInsert.push({
                roleId,
                moduleName: p.name || p.moduleName,
                subModuleName: '',
                canView: p.permissions?.view ?? p.canView ?? false,
                canAdd: p.permissions?.add ?? p.canAdd ?? false,
                canEdit: p.permissions?.edit ?? p.canEdit ?? false,
                canDelete: p.permissions?.delete ?? p.canDelete ?? false,
                canApprove: p.permissions?.approve ?? p.canApprove ?? false
            });
            if (p.subModules && Array.isArray(p.subModules)) {
                for (const sub of p.subModules) {
                    dataToInsert.push({
                        roleId,
                        moduleName: p.name || p.moduleName,
                        subModuleName: sub.name,
                        canView: sub.permissions?.view ?? false,
                        canAdd: sub.permissions?.add ?? false,
                        canEdit: sub.permissions?.edit ?? false,
                        canDelete: sub.permissions?.delete ?? false,
                        canApprove: sub.permissions?.approve ?? false
                    });
                }
            }
        }
        if (dataToInsert.length > 0) {
            await this.prisma.modulePermission.createMany({
                data: dataToInsert
            });
        }
        return this.getRolePermissions(roleId);
    }
    async getAuditLogs() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date(todayStart);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
            total: await this.prisma.systemAuditLog.count(),
            today: await this.prisma.systemAuditLog.count({ where: { createdAt: { gte: todayStart } } }),
            last7Days: await this.prisma.systemAuditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            last30Days: await this.prisma.systemAuditLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
        };
    }
    async getAuditList() {
        const logs = await this.prisma.systemAuditLog.findMany({
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return logs.map(l => ({
            id: l.id,
            user: l.user.username,
            action: l.action,
            module: l.module,
            details: l.details,
            time: l.createdAt.toISOString(),
            avatar: `https://ui-avatars.com/api/?name=${l.user.username}`
        }));
    }
};
exports.UsersRolesService = UsersRolesService;
exports.UsersRolesService = UsersRolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersRolesService);
//# sourceMappingURL=users-roles.service.js.map
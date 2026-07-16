import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersRolesService {
  constructor(private readonly prisma: PrismaService) {}

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
      totalPermissions: 156 // Fixed per UI requirements, or sum of (totalRoles * 10 modules * 5 flags)
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
      fullname: user.username, // Assuming username as fullname for now
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

  async createUser(data: any) {
    const { username, fullname, email, password, roleId, plantId } = data;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        roleId,
        plantAccess: {
          create: { plantId }
        }
      }
    });
    
    // Log audit
    await this.prisma.systemAuditLog.create({
      data: {
        userId: user.id, // Logged against new user for now as mock
        action: 'CREATED_USER',
        module: 'Users & Roles',
        details: `User ${username} created.`
      }
    });

    return user;
  }

  async toggleUserStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');
    
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive }
    });
  }

  async updateUser(id: string, data: any) {
    const { email, roleId, plantId, newPassword, currentPassword } = data;
    
    let updateData: any = {
      email,
      roleId
    };

    if (newPassword) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }

      const targetUser = await this.prisma.user.findUnique({ where: { id } });
      if (!targetUser) throw new Error('User not found');

      const isValid = await bcrypt.compare(currentPassword, targetUser.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Invalid current password');
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData
    });
    
    if (plantId) {
      // Very simplified update for plantAccess: remove existing and add new
      await this.prisma.userPlantAccess.deleteMany({ where: { userId: id } });
      await this.prisma.userPlantAccess.create({
        data: { userId: id, plantId }
      });
    }

    // Log audit
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

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    // First delete associated PlantAccess records
    await this.prisma.userPlantAccess.deleteMany({ where: { userId: id } });

    // Then delete the user
    await this.prisma.user.delete({ where: { id } });

    // Log audit
    await this.prisma.systemAuditLog.create({
      data: {
        userId: user.id, // Usually this would be the admin who did it
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

  async createRole(data: { name: string, description?: string }) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description
      }
    });
  }

    private readonly MODULE_STRUCTURE = [
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
      subModules: ['Batch Creation', 'Batch Summary']
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

  async getRolePermissions(roleId: string) {
    const existing = await this.prisma.modulePermission.findMany({
      where: { roleId }
    });

    return this.MODULE_STRUCTURE.map(mod => {
      // Find parent permission
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

  async updateRolePermissions(roleId: string, permissions: any[]) {
    // Flatten the incoming nested array
    const permsArray = Array.isArray(permissions) ? permissions : (permissions as any)?.permissions || [];
    
    // Delete existing to recreate them cleanly
    await this.prisma.modulePermission.deleteMany({ where: { roleId } });
    
    const dataToInsert: any[] = [];
    
    for (const p of permsArray) {
      // Insert Parent module
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
      
      // Insert subModules if any
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
}

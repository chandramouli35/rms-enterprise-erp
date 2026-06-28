import { Injectable } from '@nestjs/common';
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
      plant: user.plantAccess.length > 0 ? user.plantAccess.map(pa => pa.plant.name).join(', ') : 'None',
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

  async getRolePermissions(roleId: string) {
    const modules = ['Dashboard', 'Procurement', 'Weighbridge', 'Production', 'Inventory', 'Gate Pass', 'Dispatch', 'Reports', 'User Management', 'Settings'];
    
    const existing = await this.prisma.modulePermission.findMany({
      where: { roleId }
    });

    return modules.map(name => {
      const p = existing.find(e => e.moduleName === name);
      return {
        name,
        permissions: {
          view: p?.canView || false,
          add: p?.canAdd || false,
          edit: p?.canEdit || false,
          delete: p?.canDelete || false,
          approve: p?.canApprove || false
        }
      };
    });
  }

  async updateRolePermissions(roleId: string, permissions: any[]) {
    // Delete existing to recreate them cleanly or upsert
    await this.prisma.modulePermission.deleteMany({ where: { roleId } });
    
    const dataToInsert = permissions.map(p => ({
      roleId,
      moduleName: p.name,
      canView: p.permissions.view,
      canAdd: p.permissions.add,
      canEdit: p.permissions.edit,
      canDelete: p.permissions.delete,
      canApprove: p.permissions.approve
    }));

    if(dataToInsert.length > 0) {
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

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

  async getUsersList(page?: string, limit?: string) {
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      
      const [total, users] = await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.findMany({
          include: {
            role: true,
            plantAccess: {
              include: { plant: true }
            }
          },
          skip,
          take: limitNum
        })
      ]);

      const data = users.map(user => ({
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

      return { data, total };
    }

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
    const { username, fullname, email, password, roleId, plantIds } = data;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        roleId,
        plantAccess: {
          create: plantIds.map((id: string) => ({ plantId: id }))
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
    const { email, roleId, plantIds, newPassword, currentPassword } = data;
    
    let updateData: any = {
      email,
      roleId
    };

    if (newPassword) {
      const targetUser = await this.prisma.user.findUnique({ where: { id } });
      if (!targetUser) throw new Error('User not found');

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData
    });
    
    if (plantIds && Array.isArray(plantIds)) {
      // Very simplified update for plantAccess: remove existing and add new
      await this.prisma.userPlantAccess.deleteMany({ where: { userId: id } });
      await this.prisma.userPlantAccess.createMany({
        data: plantIds.map((pid: string) => ({ userId: id, plantId: pid }))
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
      subModules: [],
    },
    {
      name: 'Procurement',
      subModules: [
        'Supplier Master',
        'Mandi Master',
        'Boli Record',
        'Paddy Inward',
        'Inward List',
        'Stack to Hoodi',
        'Global Settings (Govt Rate)',
        'Reports',
        'Quality Inspection',
        'Purchase Register',
      ],
    },
    {
      name: 'Production',
      subModules: [
        'Batch Creation',
        'Production Tracking',
        'Daily Stock Report',
        'Shift-Wise Report',
        'Intermill History',
        'Compare Reports',
      ],
    },
    {
      name: 'Yield Mgmt',
      subModules: [
        'Mill Yield Benchmarks',
        'Yield from Rice',
        'Yield from Paddy',
        'Stock Health Report',
        'Consignment Dispatch',
        'Yield Calculator',
        'Yield Analytics',
        'Historical Reports',
      ],
    },
    {
      name: 'Inventory',
      subModules: [
        'Paddy Stock',
        'Rice Stock',
        'Bran Stock',
        'Husk Stock',
        'Finished Goods',
        'Consumables Inventory',
      ],
    },
    {
      name: 'Transfer',
      subModules: ['Transfer Request', 'Transfer Tracking', 'In Transit Stock'],
    },
    {
      name: 'Weighbridge',
      subModules: ['Capture', 'History', 'Settings'],
    },
    {
      name: 'Gate Pass',
      subModules: [
        'Create Gate Pass',
        'Report Summary',
        'Transfer Entry Management',
        'QR Barcode',
        'Duplicate Prevention',
      ],
    },
    {
      name: 'Staff Management',
      subModules: ['Staff List', 'Add Staff', 'Truck Management'],
    },
    {
      name: 'Dryer Work',
      subModules: ['GOYAL AGRO', 'RAJOA AGRO', 'BEAS AGRO'],
    },
    {
      name: 'Users and Roles',
      subModules: ['Users', 'Roles', 'Permissions', 'Audit Access'],
    },
    {
      name: 'Products',
      subModules: [],
    },
    {
      name: 'Plants',
      subModules: [],
    },
    {
      name: 'Settings',
      subModules: ['Global Settings'],
    },
    {
      name: 'Finance',
      subModules: [
        'Deals / Soda Record',
        'Sale',
        'Purchase',
        'Junction Report',
        'Receivables',
        'Payables',
        'Payment Received',
        'Payment Paid',
      ],
    },
    // Milestone 4 remainder (Dispatch / Power / Backup) intentionally omitted until enabled in nav
  ];

  /** Old DB moduleName → current MODULE_STRUCTURE name (no data loss on display) */
  private readonly MODULE_ALIASES: Record<string, string[]> = {
    'Yield Mgmt': ['Yield Mgmt', 'Yield'],
    Transfer: ['Transfer', 'Dispatch'],
    'Users and Roles': ['Users and Roles', 'Users', 'User Management'],
    Plants: ['Plants'],
    Products: ['Products'],
  };

  /** Old submodule labels → new nav labels (carry forward grants) */
  private readonly SUBMODULE_ALIASES: Record<string, string[]> = {
    'Create Gate Pass': ['Create Gate Pass', 'Gate In', 'Gate Out'],
    Capture: ['Capture', 'Weighment'],
    Settings: ['Settings', 'Device Config'],
    History: ['History'],
    // F32 rename: nav/Permissions UI use Boli Record; DB may still store old label
    'Boli Record': ['Boli Record', 'Paddy Purchase & Quality'],
    'Paddy Purchase & Quality': ['Paddy Purchase & Quality', 'Boli Record'],
  };

  private flagsFromPerm(row?: { canView?: boolean; canAdd?: boolean; canEdit?: boolean; canDelete?: boolean; canApprove?: boolean } | null) {
    return {
      view: !!row?.canView,
      add: !!row?.canAdd,
      edit: !!row?.canEdit,
      delete: !!row?.canDelete,
      approve: !!row?.canApprove,
    };
  }

  async getRolePermissions(roleId: string) {
    const existing = await this.prisma.modulePermission.findMany({
      where: { roleId },
    });

    const findParent = (modName: string) => {
      const names = this.MODULE_ALIASES[modName] || [modName];
      return existing.find(
        (e) => names.includes(e.moduleName) && (!e.subModuleName || e.subModuleName === ''),
      );
    };

    const findSub = (modName: string, subName: string) => {
      const modNames = this.MODULE_ALIASES[modName] || [modName];
      const subNames = this.SUBMODULE_ALIASES[subName] || [subName];
      // Prefer exact match first
      const exact = existing.find((e) => e.moduleName === modName && e.subModuleName === subName);
      if (exact) return exact;
      return existing.find(
        (e) => modNames.includes(e.moduleName) && subNames.includes(e.subModuleName || ''),
      );
    };

    return this.MODULE_STRUCTURE.map((mod) => {
      const parentPerm = findParent(mod.name);
      const parentFlags = this.flagsFromPerm(parentPerm);

      return {
        name: mod.name,
        permissions: parentFlags,
        subModules: mod.subModules.map((subName) => {
          const subPerm = findSub(mod.name, subName);
          const raw = this.flagsFromPerm(subPerm);
          const hasAny = raw.view || raw.add || raw.edit || raw.delete || raw.approve;
          // New/empty rows inherit parent so existing Yield/Gate access isn't blanked on UI
          const subFlags =
            subPerm && hasAny ? raw : parentFlags.view ? { ...parentFlags } : raw;
          return {
            name: subName,
            permissions: subFlags,
          };
        }),
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

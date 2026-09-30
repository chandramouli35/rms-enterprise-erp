import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FingerprintVerifyService } from '../auth/fingerprint-verify.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fingerprintVerify: FingerprintVerifyService,
  ) {}

  async getStats() {
    const notDeleted = { deletedAt: null as Date | null };
    const [totalUsers, activeUsers, inactiveUsers, totalRoles] = await Promise.all([
      this.prisma.user.count({ where: notDeleted }),
      this.prisma.user.count({ where: { ...notDeleted, isActive: true } }),
      this.prisma.user.count({ where: { ...notDeleted, isActive: false } }),
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
    const notDeleted = { deletedAt: null as Date | null };
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      
      const [total, users] = await this.prisma.$transaction([
        this.prisma.user.count({ where: notDeleted }),
        this.prisma.user.findMany({
          where: notDeleted,
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
        plantIds: user.plantAccess.map(pa => pa.plantId),
        plantAccess: user.plantAccess.map(pa => ({
          plantId: pa.plantId,
          plant: pa.plant,
        })),
        status: user.isActive ? 'Active' : 'Inactive',
        lastLogin: user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never',
        avatar: `https://ui-avatars.com/api/?name=${user.username}`
      }));

      return { data, total };
    }

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
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
      plantIds: user.plantAccess.map(pa => pa.plantId),
      plantAccess: user.plantAccess.map(pa => ({
        plantId: pa.plantId,
        plant: pa.plant,
      })),
      status: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never',
      avatar: `https://ui-avatars.com/api/?name=${user.username}`
    }));
  }

  /** Live duplicate check while typing username (Add User / Transfer). */
  async checkUsernameExists(username: string) {
    const trimmed = String(username || '').trim();
    if (!trimmed || trimmed.length < 2) {
      return { exists: false, username: trimmed || null };
    }
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: trimmed, mode: 'insensitive' } },
          { email: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, deletedAt: true },
    });
    return {
      exists: !!existing,
      username: trimmed,
      archived: !!existing?.deletedAt,
      existingUsername: existing?.username ?? null,
    };
  }

  async createUser(data: any) {
    const {
      username,
      fullName,
      fullname,
      email,
      password,
      roleId,
      plantIds,
      fingerprint1,
      fingerprint2,
      fingerprint1Template,
      fingerprint2Template,
    } = data;

    const trimmedUsername = String(username || '').trim();
    if (!trimmedUsername) {
      throw new BadRequestException('Username is required.');
    }
    if (!password) {
      throw new BadRequestException('Password is required.');
    }

    const emailToUse = String(email || trimmedUsername).trim();

    const existingByUsername = await this.prisma.user.findFirst({
      where: { username: trimmedUsername },
      select: { id: true, deletedAt: true },
    });
    if (existingByUsername) {
      throw new BadRequestException(
        existingByUsername.deletedAt
          ? `Username "${trimmedUsername}" already exists (archived). Choose a different username.`
          : `Username "${trimmedUsername}" already exists. Choose a different username.`,
      );
    }

    const existingByEmail = await this.prisma.user.findFirst({
      where: { email: emailToUse },
      select: { id: true },
    });
    if (existingByEmail) {
      throw new BadRequestException(
        `Email "${emailToUse}" is already in use. Choose a different email or username.`,
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const role = roleId
      ? await this.prisma.role.findUnique({ where: { id: roleId } })
      : null;
    const isSupervisor = !!role?.name && /supervisor/i.test(role.name);
    if (isSupervisor && (!fingerprint1 || !fingerprint2)) {
      throw new BadRequestException(
        'Supervisor registration requires two fingerprint scans.',
      );
    }

    const tpl1 = FingerprintVerifyService.resolveTemplate(
      fingerprint1,
      fingerprint1Template,
    );
    const tpl2 = FingerprintVerifyService.resolveTemplate(
      fingerprint2,
      fingerprint2Template,
    );

    await this.fingerprintVerify.assertEnrollmentPairNotDuplicate(
      fingerprint1,
      tpl1,
      fingerprint2,
      tpl2,
    );

    const normalizedPlants = await this.normalizePlantIdsForRole(role, plantIds);

    // Non-admin: max 2 fingerprints (schema has only 2 slots); reject extras if sent
    if (
      !this.roleAllowsMultipleMillsByName(role?.name) &&
      (fingerprint1 || fingerprint2)
    ) {
      // already only 2 fields — enforce both are distinct when both present
      if (fingerprint1 && fingerprint2 && fingerprint1 === fingerprint2) {
        throw new BadRequestException(
          'Finger 1 and Finger 2 must be two different captures.',
        );
      }
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          username: trimmedUsername,
          email: emailToUse,
          passwordHash,
          roleId,
          fingerprint1: fingerprint1 || null,
          fingerprint2: fingerprint2 || null,
          fingerprint1Template: tpl1,
          fingerprint2Template: tpl2,
          plantAccess: {
            create: normalizedPlants.map((id: string) => ({ plantId: id })),
          },
        },
      });

      await this.prisma.systemAuditLog.create({
        data: {
          userId: user.id,
          action: 'CREATED_USER',
          module: 'Users & Roles',
          details: `User ${trimmedUsername} created${isSupervisor ? ' with 2 fingerprints' : ''}.${fullName || fullname ? ` Name: ${fullName || fullname}` : ''}`,
        },
      });

      return user;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        const fields = err?.meta?.target;
        const fieldLabel = Array.isArray(fields) ? fields.join(', ') : 'username or email';
        throw new BadRequestException(
          `A user with this ${fieldLabel} already exists. Choose a different value.`,
        );
      }
      throw err;
    }
  }

  /** Admin / Superadmin always multi-mill; others need "Add more than one mill" permission. */
  private roleAllowsMultipleMillsByName(roleName?: string | null): boolean {
    if (!roleName) return false;
    const n = String(roleName).trim().toUpperCase().replace(/[\s-]+/g, '_');
    return (
      n === 'SUPER_ADMIN' ||
      n === 'SUPERADMIN' ||
      n === 'ADMIN' ||
      n === 'ADMINISTRATOR'
    );
  }

  private async roleAllowsMultipleMills(
    role: { id?: string; name?: string | null } | null | undefined,
  ): Promise<boolean> {
    if (this.roleAllowsMultipleMillsByName(role?.name)) return true;
    if (!role?.id) return false;
    const perm = await this.prisma.modulePermission.findFirst({
      where: {
        roleId: role.id,
        moduleName: 'Users and Roles',
        subModuleName: 'Add more than one mill',
        OR: [
          { canView: true },
          { canAdd: true },
          { canEdit: true },
          { canApprove: true },
        ],
      },
    });
    return !!perm;
  }

  private async normalizePlantIdsForRole(
    role: { id?: string; name?: string | null } | null | undefined,
    plantIds: any,
  ): Promise<string[]> {
    const ids = Array.isArray(plantIds)
      ? [...new Set(plantIds.map((id: any) => String(id)).filter(Boolean))]
      : [];
    if (!ids.length) {
      throw new BadRequestException('At least one plant must be selected.');
    }
    const multi = await this.roleAllowsMultipleMills(role);
    if (!multi && ids.length > 1) {
      throw new BadRequestException(
        'This role can be assigned to only one plant. Enable "Add more than one mill" on the role, or use Admin / Superadmin.',
      );
    }
    return multi ? ids : [ids[0]];
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

    const effectiveRoleId = roleId;
    const role = effectiveRoleId
      ? await this.prisma.role.findUnique({ where: { id: effectiveRoleId } })
      : await this.prisma.user.findUnique({
          where: { id },
          include: { role: true },
        }).then((u) => u?.role || null);

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData
    });
    
    if (plantIds && Array.isArray(plantIds)) {
      const normalizedPlants = await this.normalizePlantIdsForRole(
        role as any,
        plantIds,
      );
      await this.prisma.userPlantAccess.deleteMany({ where: { userId: id } });
      await this.prisma.userPlantAccess.createMany({
        data: normalizedPlants.map((pid: string) => ({ userId: id, plantId: pid }))
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

    // Soft-delete so historical entries (audit, procurement names, fingerprints) remain
    const stamp = id.slice(0, 8);
    await this.prisma.userPlantAccess.deleteMany({ where: { userId: id } });
    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        refreshToken: null,
        username: `${user.username}__archived__${stamp}`,
        email: `archived+${stamp}.${user.email}`.slice(0, 190),
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userId: user.id,
        action: 'DELETED_USER',
        module: 'Users & Roles',
        details: `User ${user.username} archived (soft-deleted). Historical records preserved.`,
      }
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Transfer a single-mill user to another mill:
   * creates a new User ID + password (+ fingerprints for supervisors),
   * archives the old Mill A account while preserving history/fingerprints.
   */
  async transferUser(
    id: string,
    data: {
      plantId: string;
      username: string;
      password: string;
      email?: string;
      fingerprint1?: string;
      fingerprint2?: string;
      fingerprint1Template?: string;
      fingerprint2Template?: string;
    },
  ) {
    const source = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, plantAccess: true },
    });
    if (!source || source.deletedAt) {
      throw new BadRequestException('Source user not found');
    }
    if (await this.roleAllowsMultipleMills(source.role)) {
      throw new BadRequestException(
        'Admin / Superadmin (or multi-mill roles) should update Primary Plant instead of transferring.',
      );
    }
    if (!data.plantId || !data.username || !data.password) {
      throw new BadRequestException('plantId, username and password are required.');
    }
    const alreadyOnPlant = source.plantAccess.some((p) => p.plantId === data.plantId);
    if (alreadyOnPlant && source.plantAccess.length === 1) {
      throw new BadRequestException('User is already assigned only to this mill.');
    }

    const isSupervisor = /supervisor/i.test(source.role?.name || '');
    if (isSupervisor && (!data.fingerprint1 || !data.fingerprint2)) {
      throw new BadRequestException(
        'Supervisor transfer requires two new fingerprint scans for the destination mill.',
      );
    }
    if (
      data.fingerprint1 &&
      data.fingerprint2 &&
      data.fingerprint1 === data.fingerprint2
    ) {
      throw new BadRequestException(
        'Finger 1 and Finger 2 must be two different captures.',
      );
    }

    const tpl1 = FingerprintVerifyService.resolveTemplate(
      data.fingerprint1,
      data.fingerprint1Template,
    );
    const tpl2 = FingerprintVerifyService.resolveTemplate(
      data.fingerprint2,
      data.fingerprint2Template,
    );

    await this.fingerprintVerify.assertEnrollmentPairNotDuplicate(
      data.fingerprint1,
      tpl1,
      data.fingerprint2,
      tpl2,
    );

    const passwordHash = await bcrypt.hash(data.password, 10);
    const newUser = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email || data.username,
        passwordHash,
        roleId: source.roleId,
        fingerprint1: data.fingerprint1 || null,
        fingerprint2: data.fingerprint2 || null,
        fingerprint1Template: tpl1,
        fingerprint2Template: tpl2,
        plantAccess: {
          create: [{ plantId: data.plantId }],
        },
      },
    });

    // Archive Mill A account — keep fingerprints & id for historical reference
    const stamp = source.id.slice(0, 8);
    await this.prisma.userPlantAccess.deleteMany({ where: { userId: source.id } });
    await this.prisma.user.update({
      where: { id: source.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        refreshToken: null,
        username: `${source.username}__archived__${stamp}`,
        email: `archived+${stamp}.${source.email}`.slice(0, 190),
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userId: newUser.id,
        action: 'TRANSFERRED_USER',
        module: 'Users & Roles',
        details: `Transferred from archived user ${source.username} (${source.id}) to ${newUser.username} at plant ${data.plantId}.`,
        entityId: source.id,
        plantId: data.plantId,
      },
    });

    return {
      message: 'User transferred successfully',
      archivedUserId: source.id,
      newUser,
    };
  }

  async getRoles() {
    const roles = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    const multiPerms = await this.prisma.modulePermission.findMany({
      where: {
        moduleName: 'Users and Roles',
        subModuleName: 'Add more than one mill',
        OR: [
          { canView: true },
          { canAdd: true },
          { canEdit: true },
          { canApprove: true },
        ],
      },
      select: { roleId: true },
    });
    const multiSet = new Set(multiPerms.map((p) => p.roleId));
    return roles.map((r) => ({
      ...r,
      allowsMultipleMills:
        this.roleAllowsMultipleMillsByName(r.name) || multiSet.has(r.id),
    }));
  }

  async createRole(data: { name: string, description?: string }) {
    const trimmed = String(data.name || '').trim().toUpperCase();
    if (!trimmed) {
      throw new BadRequestException('Role name is required.');
    }
    const existing = await this.prisma.role.findFirst({
      where: { name: { equals: trimmed, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        `Role name "${trimmed}" already exists. Choose a different name.`,
      );
    }
    try {
      return await this.prisma.role.create({
        data: {
          name: trimmed,
          description: data.description,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          `Role name "${trimmed}" already exists. Choose a different name.`,
        );
      }
      throw err;
    }
  }

  async updateRole(
    roleId: string,
    data: { name?: string; description?: string },
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role not found.');

    const trimmed =
      data.name != null ? String(data.name).trim().toUpperCase() : role.name;
    if (!trimmed) {
      throw new BadRequestException('Role name is required.');
    }

    if (trimmed !== role.name) {
      const clash = await this.prisma.role.findFirst({
        where: {
          name: { equals: trimmed, mode: 'insensitive' },
          id: { not: roleId },
        },
        select: { id: true },
      });
      if (clash) {
        throw new BadRequestException(
          `Role name "${trimmed}" already exists. Choose a different name.`,
        );
      }
    }

    try {
      return await this.prisma.role.update({
        where: { id: roleId },
        data: {
          name: trimmed,
          description:
            data.description !== undefined
              ? data.description
              : role.description,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException(
          `Role name "${trimmed}" already exists. Choose a different name.`,
        );
      }
      throw err;
    }
  }

  /** Live duplicate check while typing role name. */
  async checkRoleExists(name: string, excludeId?: string) {
    const trimmed = String(name || '').trim().toUpperCase();
    if (!trimmed || trimmed.length < 2) {
      return { exists: false, name: trimmed || null };
    }
    const existing = await this.prisma.role.findFirst({
      where: {
        name: { equals: trimmed, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, name: true },
    });
    return {
      exists: !!existing,
      name: trimmed,
      existingName: existing?.name ?? null,
    };
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
        'Stack to Hoodi',
        'Dryer Bharai to Stack',
        'Paddy Inward',
        'Inward List',
        'Loader & Unloader',
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
      subModules: [
        'Users',
        'Roles',
        'Permissions',
        'Audit Access',
        'Add more than one mill',
      ],
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
        'Master',
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
    {
      name: 'Expenses',
      subModules: ['Add Funds', 'Expenses', 'Petty Cashbook', 'COGS'],
    },
    {
      name: 'Trucks & Diesel',
      subModules: ['Add Fuel', 'Truck Average', 'Pump wise details'],
    },
    {
      name: 'CMS',
      subModules: [
        'Real-time Paddy Inward (Notified)',
        'Boli Record with Pending Boli Also',
        'Real-time GP Entry Tracking (Notified)',
        'Paddy Stock',
        'Production Tracking',
        'Live Stock Ledger',
        'Yield Analysis',
        'Alerts on Abnormal Transactions',
        'Real-time Basis Tracking',
        'CMS User Permission Controls',
        'Full Traceability',
        'Plant-Wise Comparison',
        'Manual Correction Alerts',
        'Overprice Detection',
        'Weighment Pattern Monitoring',
        'Correction Audit Control',
        'Audit Logs Tracking',
        'Transaction Severity Categories',
        'Stock Available for Dispatch',
        'Receivables Tracking',
        'Paddy Cost Tracking',
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
    'Stack to Hoodi': ['Stack to Hoodi', 'Stack to Hoodi Transfer'],
    'Dryer Bharai to Stack': ['Dryer Bharai to Stack', 'Dryer Bharai'],
    'Loader & Unloader': ['Loader & Unloader', 'Loader Unloader'],
    'Global Settings (Govt Rate)': ['Global Settings (Govt Rate)', 'Global Settings'],
    // CMS renames — keep older permission rows working
    'Real-time Paddy Inward (Notified)': ['Real-time Paddy Inward (Notified)', 'Paddy Inward', 'Overview'],
    'Boli Record with Pending Boli Also': ['Boli Record with Pending Boli Also', 'Boli Record'],
    'Real-time GP Entry Tracking (Notified)': ['Real-time GP Entry Tracking (Notified)', 'GP Entry Tracking'],
    'Alerts on Abnormal Transactions': ['Alerts on Abnormal Transactions', 'Abnormal Alerts'],
    'Real-time Basis Tracking': ['Real-time Basis Tracking', 'Overview'],
    'CMS User Permission Controls': ['CMS User Permission Controls', 'User Rights Controls'],
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

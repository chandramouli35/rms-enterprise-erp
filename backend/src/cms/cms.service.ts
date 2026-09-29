import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersRolesService } from '../users-roles/users-roles.service';

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRoles: UsersRolesService,
  ) {}

  private startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private async plants() {
    return this.prisma.plant.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Mill-wise snapshot for the CMS home wall (polled). */
  async getOverview() {
    const plants = await this.plants();
    const today = this.startOfDay();
    const plantIds = plants.map((p) => p.id);

    const [
      inwards,
      bolis,
      activeGps,
      gpToday,
      inventory,
      production,
      ledgerToday,
      yields,
      notifications,
    ] = await Promise.all([
      this.prisma.procurementBatch.findMany({
        where: {
          plantId: { in: plantIds },
          createdAt: { gte: today },
          paddyInwardDetails: { isNot: null },
        },
        select: {
          plantId: true,
          paddyInwardDetails: { select: { bagsRecAtMill: true, netWtAtMill: true } },
        },
      }),
      this.prisma.paddyBoli.findMany({
        where: {
          sodaPending: { plantId: { in: plantIds } },
          isCancelled: false,
        },
        select: {
          bags: true,
          bagsReceived: true,
          isCompleted: true,
          sodaPending: { select: { plantId: true } },
        },
      }),
      this.prisma.gatePass.groupBy({
        by: ['plantId'],
        where: { plantId: { in: plantIds }, status: 'ACTIVE' },
        _count: { _all: true },
      }),
      this.prisma.gatePass.groupBy({
        by: ['plantId'],
        where: { plantId: { in: plantIds }, createdAt: { gte: today } },
        _count: { _all: true },
      }),
      this.prisma.inventory.findMany({
        where: { plantId: { in: plantIds }, itemType: 'PADDY' },
        select: { plantId: true, quantity: true },
      }),
      this.prisma.productionBatch.findMany({
        where: { plantId: { in: plantIds }, date: { gte: today } },
        select: {
          plantId: true,
          paddyUsedQty: true,
          riceProducedQty: true,
          status: true,
          progress: true,
        },
      }),
      this.prisma.stockLedger.groupBy({
        by: ['plantId'],
        where: { plantId: { in: plantIds }, createdAt: { gte: today } },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
      this.prisma.productionBatch.findMany({
        where: {
          plantId: { in: plantIds },
          yieldReport: { isNot: null },
          createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
        },
        select: {
          plantId: true,
          yieldReport: { select: { overallRecovery: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.notification.findMany({
        where: { isRead: false, createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const mills = plants.map((p) => {
      const millInwards = inwards.filter((i) => i.plantId === p.id);
      const millBolis = bolis.filter((b) => b.sodaPending.plantId === p.id);
      const pendingBolis = millBolis.filter(
        (b) => !b.isCompleted && (b.bagsReceived || 0) < (b.bags || 0),
      );
      const millInv = inventory.filter((i) => i.plantId === p.id);
      const millProd = production.filter((x) => x.plantId === p.id);
      const millYields = yields
        .filter((y) => y.plantId === p.id && y.yieldReport)
        .map((y) => y.yieldReport!.overallRecovery)
        .filter((n) => n != null);
      const avgYield =
        millYields.length > 0
          ? millYields.reduce((a, b) => a + b, 0) / millYields.length
          : null;
      const gpActive =
        activeGps.find((g) => g.plantId === p.id)?._count._all || 0;
      const gpCreated =
        gpToday.find((g) => g.plantId === p.id)?._count._all || 0;
      const ledger = ledgerToday.find((l) => l.plantId === p.id);

      return {
        plantId: p.id,
        plantName: p.name,
        plantCode: p.code,
        paddyInward: {
          count: millInwards.length,
          bags: millInwards.reduce(
            (s, i) => s + (i.paddyInwardDetails?.bagsRecAtMill || 0),
            0,
          ),
          netWtMt: millInwards.reduce(
            (s, i) => s + (i.paddyInwardDetails?.netWtAtMill || 0),
            0,
          ),
        },
        boli: {
          total: millBolis.length,
          pending: pendingBolis.length,
          bagsPending: pendingBolis.reduce(
            (s, b) => s + Math.max(0, (b.bags || 0) - (b.bagsReceived || 0)),
            0,
          ),
        },
        gatePass: { active: gpActive, today: gpCreated },
        paddyStockMt: millInv.reduce((s, i) => s + (i.quantity || 0), 0),
        production: {
          batches: millProd.length,
          inProgress: millProd.filter((x) => x.status === 'In Progress').length,
          paddyUsedMt: millProd.reduce((s, x) => s + (x.paddyUsedQty || 0), 0),
          riceMt: millProd.reduce((s, x) => s + (x.riceProducedQty || 0), 0),
        },
        stockLedgerToday: {
          entries: ledger?._count._all || 0,
          qtyMt: ledger?._sum.quantity || 0,
        },
        yieldAvg7d: avgYield != null ? Math.round(avgYield * 10) / 10 : null,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      mills,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        createdAt: n.createdAt,
      })),
      totals: {
        mills: mills.length,
        inwardToday: mills.reduce((s, m) => s + m.paddyInward.count, 0),
        pendingBolis: mills.reduce((s, m) => s + m.boli.pending, 0),
        activeGps: mills.reduce((s, m) => s + m.gatePass.active, 0),
        paddyStockMt: mills.reduce((s, m) => s + m.paddyStockMt, 0),
        productionBatches: mills.reduce((s, m) => s + m.production.batches, 0),
      },
    };
  }

  private async recentNotifications(keywords: string[], take = 30) {
    const today = this.startOfDay();
    const or = keywords.flatMap((k) => [
      { type: { contains: k, mode: 'insensitive' as const } },
      { title: { contains: k, mode: 'insensitive' as const } },
      { message: { contains: k, mode: 'insensitive' as const } },
    ]);
    return this.prisma.notification.findMany({
      where: {
        createdAt: { gte: today },
        OR: or,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getPaddyInward(plantId?: string) {
    const today = this.startOfDay();
    const where: any = {
      createdAt: { gte: today },
      paddyInwardDetails: { isNot: null },
    };
    if (plantId && plantId !== 'global') where.plantId = plantId;

    const [rows, notifications] = await Promise.all([
      this.prisma.procurementBatch.findMany({
        where,
        include: {
          plant: { select: { id: true, name: true, code: true } },
          supplier: { select: { name: true, mandi: true } },
          paddyInwardDetails: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.recentNotifications([
        'INWARD',
        'BAGS',
        'PADDY',
        'QUALITY',
        'MANDI',
        'SHORTAGE',
      ]),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      notified: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        createdAt: n.createdAt,
        isRead: n.isRead,
      })),
      rows: rows.map((r) => ({
        id: r.id,
        plantId: r.plantId,
        plantName: r.plant.name,
        plantCode: r.plant.code,
        time: r.createdAt,
        truckNo: r.paddyInwardDetails?.truckNo,
        gpNo: r.paddyInwardDetails?.gpNo,
        mandi: r.paddyInwardDetails?.mandi || r.supplier?.mandi,
        artia: r.supplier?.name,
        bags: r.paddyInwardDetails?.bagsRecAtMill,
        netWt: r.paddyInwardDetails?.netWtAtMill,
        moisture: (r.paddyInwardDetails as any)?.moisture ?? null,
        bardanaClass: r.paddyInwardDetails?.bardanaClass,
      })),
    };
  }

  async getBoliRecords(plantId?: string) {
    const where: any = { isCancelled: false };
    if (plantId && plantId !== 'global') {
      where.sodaPending = { plantId };
    }

    const rows = await this.prisma.paddyBoli.findMany({
      where,
      include: {
        sodaPending: {
          include: {
            plant: { select: { id: true, name: true, code: true } },
            supplier: { select: { name: true, mandi: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    const mapped = rows.map((b) => {
      const pendingBags = Math.max(0, (b.bags || 0) - (b.bagsReceived || 0));
      const isPending = !b.isCompleted && pendingBags > 0;
      return {
        id: b.id,
        plantId: b.sodaPending.plantId,
        plantName: b.sodaPending.plant.name,
        plantCode: b.sodaPending.plant.code,
        boliNo: b.boliNo,
        date: b.sodaPending.date,
        artia: b.sodaPending.supplier.name,
        mandi: b.sodaPending.supplier.mandi,
        bags: b.bags,
        bagsReceived: b.bagsReceived,
        pendingBags,
        rate: b.rate,
        isCompleted: b.isCompleted,
        isPending,
        status: b.isCompleted ? 'Completed' : isPending ? 'Pending' : 'Open',
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      pending: mapped.filter((r) => r.isPending),
      all: mapped,
    };
  }

  async getGatePassTracking(plantId?: string) {
    const today = this.startOfDay();
    const where: any = {
      OR: [{ status: 'ACTIVE' }, { createdAt: { gte: today } }],
    };
    if (plantId && plantId !== 'global') where.plantId = plantId;

    const [rows, notifications] = await Promise.all([
      this.prisma.gatePass.findMany({
        where,
        include: {
          plant: { select: { id: true, name: true, code: true } },
          supplier: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.recentNotifications(['GATE', 'GP', 'PASS', 'METER', 'VEHICLE']),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      notified: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        createdAt: n.createdAt,
        isRead: n.isRead,
      })),
      rows: rows.map((g) => ({
        id: g.id,
        plantId: g.plantId,
        plantName: g.plant.name,
        plantCode: g.plant.code,
        passType: g.passType,
        vehicleNo: g.vehicleNo,
        status: g.status,
        purpose: g.purpose,
        material: g.material,
        noOfBags: g.noOfBags,
        partyName: g.partyName || g.supplier?.name,
        qrCode: g.qrCode,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
    };
  }

  async getPaddyStock(plantId?: string) {
    const where: any = { itemType: 'PADDY' };
    if (plantId && plantId !== 'global') where.plantId = plantId;

    const rows = await this.prisma.inventory.findMany({
      where,
      include: { plant: { select: { id: true, name: true, code: true } } },
      orderBy: [{ plant: { name: 'asc' } }, { variety: 'asc' }],
    });

    const byMill = new Map<
      string,
      { plantId: string; plantName: string; plantCode: string; totalMt: number; lines: any[] }
    >();

    for (const r of rows) {
      if (!byMill.has(r.plantId)) {
        byMill.set(r.plantId, {
          plantId: r.plantId,
          plantName: r.plant.name,
          plantCode: r.plant.code,
          totalMt: 0,
          lines: [],
        });
      }
      const m = byMill.get(r.plantId)!;
      m.totalMt += r.quantity || 0;
      m.lines.push({
        variety: r.variety,
        godown: r.godown,
        quantity: r.quantity,
        usable: r.usable,
        reserved: r.reserved,
        damaged: r.damaged,
        unit: r.unit,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      mills: [...byMill.values()],
    };
  }

  async getProductionTracking(plantId?: string) {
    const today = this.startOfDay();
    const where: any = { date: { gte: today } };
    if (plantId && plantId !== 'global') where.plantId = plantId;

    const rows = await this.prisma.productionBatch.findMany({
      where,
      include: {
        plant: { select: { id: true, name: true, code: true } },
        yieldReport: { select: { overallRecovery: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      generatedAt: new Date().toISOString(),
      rows: rows.map((b) => ({
        id: b.id,
        plantId: b.plantId,
        plantName: b.plant.name,
        plantCode: b.plant.code,
        batchNo: b.batchNo,
        shift: b.shift,
        status: b.status,
        progress: b.progress,
        paddyUsedQty: b.paddyUsedQty,
        riceProducedQty: b.riceProducedQty,
        variety: b.variety,
        productionState: b.productionState,
        yieldPct: b.yieldReport?.overallRecovery ?? null,
        createdAt: b.createdAt,
      })),
    };
  }

  async getLiveStockLedger(plantId?: string, limit = 100) {
    const where: any = {};
    if (plantId && plantId !== 'global') where.plantId = plantId;

    const rows = await this.prisma.stockLedger.findMany({
      where,
      include: { plant: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 300),
    });

    return {
      generatedAt: new Date().toISOString(),
      rows: rows.map((l) => ({
        id: l.id,
        plantId: l.plantId,
        plantName: l.plant.name,
        plantCode: l.plant.code,
        transaction: l.transaction,
        itemType: l.itemType,
        quantity: l.quantity,
        shift: l.shift,
        reference: l.reference,
        remarks: l.remarks,
        createdAt: l.createdAt,
      })),
    };
  }

  async getYieldAnalysis(plantId?: string) {
    const since = new Date(Date.now() - 14 * 86400000);
    const where: any = {
      createdAt: { gte: since },
      yieldReport: { isNot: null },
    };
    if (plantId && plantId !== 'global') where.plantId = plantId;

    const rows = await this.prisma.productionBatch.findMany({
      where,
      include: {
        plant: { select: { id: true, name: true, code: true } },
        yieldReport: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const byMill = new Map<string, any>();
    for (const b of rows) {
      if (!byMill.has(b.plantId)) {
        byMill.set(b.plantId, {
          plantId: b.plantId,
          plantName: b.plant.name,
          plantCode: b.plant.code,
          samples: [] as number[],
          recent: [] as any[],
        });
      }
      const m = byMill.get(b.plantId)!;
      const y = b.yieldReport?.overallRecovery;
      if (y != null) m.samples.push(y);
      if (m.recent.length < 10) {
        m.recent.push({
          batchNo: b.batchNo,
          date: b.date,
          shift: b.shift,
          yieldPct: y,
          paddyUsedQty: b.paddyUsedQty,
          riceProducedQty: b.riceProducedQty,
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      mills: [...byMill.values()].map((m) => ({
        plantId: m.plantId,
        plantName: m.plantName,
        plantCode: m.plantCode,
        avgYield:
          m.samples.length > 0
            ? Math.round(
                (m.samples.reduce((a: number, b: number) => a + b, 0) /
                  m.samples.length) *
                  10,
              ) / 10
            : null,
        minYield: m.samples.length ? Math.min(...m.samples) : null,
        maxYield: m.samples.length ? Math.max(...m.samples) : null,
        sampleCount: m.samples.length,
        recent: m.recent,
      })),
    };
  }

  /** Abnormal transaction alerts across mills. */
  async getAbnormalAlerts(plantId?: string) {
    const today = this.startOfDay();
    const pFilter =
      plantId && plantId !== 'global' ? { plantId } : ({} as any);
    const alerts: any[] = [];

    const [lowStock, lowYield, meterBroken, bigShortage, cancelHeavy, notifs] =
      await Promise.all([
        this.prisma.inventory.findMany({
          where: { ...pFilter, itemType: 'PADDY', quantity: { lt: 50 } },
          include: { plant: { select: { name: true, code: true } } },
        }),
        this.prisma.productionBatch.findMany({
          where: {
            ...pFilter,
            createdAt: { gte: new Date(Date.now() - 3 * 86400000) },
            yieldReport: { overallRecovery: { lt: 60 } },
          },
          include: {
            plant: { select: { name: true, code: true } },
            yieldReport: true,
          },
          take: 30,
        }),
        this.prisma.gatePass.findMany({
          where: { ...pFilter, meterNotWorking: true, createdAt: { gte: today } },
          include: { plant: { select: { name: true, code: true } } },
          take: 30,
        }),
        this.prisma.procurementBatch.findMany({
          where: {
            ...pFilter,
            createdAt: { gte: today },
            paddyInwardDetails: { shortageQtl: { gt: 5 } },
          },
          include: {
            plant: { select: { name: true, code: true } },
            paddyInwardDetails: true,
            supplier: { select: { name: true } },
          },
          take: 30,
        }),
        this.prisma.paddySodaPending.findMany({
          where: { ...pFilter, cancelCount: { gte: 3 }, date: { gte: today } },
          include: {
            plant: { select: { name: true, code: true } },
            supplier: { select: { name: true } },
          },
          take: 20,
        }),
        this.prisma.notification.findMany({
          where: {
            isRead: false,
            createdAt: { gte: today },
            OR: [
              { type: { contains: 'ALERT', mode: 'insensitive' } },
              { type: { contains: 'QUALITY', mode: 'insensitive' } },
              { type: { contains: 'SHORTAGE', mode: 'insensitive' } },
              { title: { contains: 'alert', mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 40,
        }),
      ]);

    for (const i of lowStock) {
      alerts.push({
        severity: 'warning',
        type: 'LowPaddyStock',
        plantName: i.plant.name,
        plantCode: i.plant.code,
        title: 'Low Paddy Stock',
        details: `${i.variety || 'Paddy'} @ ${i.godown || '—'} is ${i.quantity} ${i.unit}`,
        at: i.updatedAt,
      });
    }
    for (const b of lowYield) {
      alerts.push({
        severity: 'critical',
        type: 'LowYield',
        plantName: b.plant.name,
        plantCode: b.plant.code,
        title: 'Abnormal Yield',
        details: `Batch ${b.batchNo} recovery ${b.yieldReport?.overallRecovery}%`,
        at: b.createdAt,
      });
    }
    for (const g of meterBroken) {
      alerts.push({
        severity: 'warning',
        type: 'MeterNotWorking',
        plantName: g.plant.name,
        plantCode: g.plant.code,
        title: 'Meter Not Working',
        details: `GP ${g.qrCode || g.id.slice(0, 8)} · ${g.vehicleNo}`,
        at: g.createdAt,
      });
    }
    for (const r of bigShortage) {
      alerts.push({
        severity: 'critical',
        type: 'HighShortage',
        plantName: r.plant.name,
        plantCode: r.plant.code,
        title: 'High Shortage',
        details: `${r.supplier?.name || '—'} · ${r.paddyInwardDetails?.shortageQtl} qtl`,
        at: r.createdAt,
      });
    }
    for (const s of cancelHeavy) {
      alerts.push({
        severity: 'warning',
        type: 'HeavyCancel',
        plantName: s.plant.name,
        plantCode: s.plant.code,
        title: 'Heavy Boli Cancels',
        details: `${s.supplier.name} · ${s.cancelCount} cancels today`,
        at: s.updatedAt,
      });
    }
    for (const n of notifs) {
      alerts.push({
        severity: 'info',
        type: n.type || 'Notification',
        plantName: '—',
        plantCode: '—',
        title: n.title,
        details: n.message,
        at: n.createdAt,
      });
    }

    alerts.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return { generatedAt: new Date().toISOString(), alerts };
  }

  /** CMS User Permission Controls — roles for normal users only */
  async listNormalRolesWithUsers() {
    const roles = await this.prisma.role.findMany({
      where: { name: { not: 'SUPER_ADMIN' } },
      orderBy: { name: 'asc' },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true, username: true, isActive: true },
          take: 50,
        },
      },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      users: r.users,
      userCount: r.users.length,
    }));
  }

  async getRolePermissionsMirror(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role not found');
    if (role.name === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'SUPER_ADMIN rights are not editable from CMS',
      );
    }
    return this.usersRoles.getRolePermissions(roleId);
  }

  async saveRolePermissionsMirror(roleId: string, permissions: any[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role not found');
    if (role.name === 'SUPER_ADMIN') {
      throw new BadRequestException(
        'SUPER_ADMIN rights are not editable from CMS',
      );
    }
    return this.usersRoles.updateRolePermissions(roleId, permissions);
  }
}

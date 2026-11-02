import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Severity = 'critical' | 'warning' | 'normal';

@Injectable()
export class CmsControlsService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private daysAgo(n: number) {
    return new Date(Date.now() - n * 86400000);
  }

  private plantFilter(plantId?: string) {
    return plantId && plantId !== 'global' ? { plantId } : {};
  }

  /** Full Traceability — mill-wise transaction chains */
  async getFullTraceability(plantId?: string) {
    const where: any = {
      ...this.plantFilter(plantId),
      createdAt: { gte: this.daysAgo(7) },
    };
    const rows = await this.prisma.procurementBatch.findMany({
      where,
      include: {
        plant: { select: { id: true, name: true, code: true } },
        supplier: { select: { name: true, mandi: true } },
        gatePass: {
          select: {
            id: true,
            qrCode: true,
            vehicleNo: true,
            status: true,
            passType: true,
            createdAt: true,
          },
        },
        weighbridge: {
          select: {
            id: true,
            vehicleNo: true,
            netWeight: true,
            grossWeight: true,
            tareWeight: true,
            status: true,
            createdAt: true,
          },
        },
        paddyInwardDetails: true,
        quality: { select: { status: true, moisture: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    return {
      generatedAt: new Date().toISOString(),
      rows: rows.map((r) => {
        const chain = [
          r.gatePass ? 'GP' : null,
          r.weighbridge ? 'Weighbridge' : null,
          r.paddyInwardDetails ? 'Paddy Inward' : null,
          r.quality ? 'QC' : null,
          r.supplier ? 'Artia' : null,
        ].filter(Boolean);
        return {
          id: r.id,
          plantName: r.plant.name,
          plantCode: r.plant.code,
          time: r.createdAt,
          artia: r.supplier?.name,
          mandi: r.supplier?.mandi || r.paddyInwardDetails?.mandi,
          truckNo:
            r.paddyInwardDetails?.truckNo ||
            r.gatePass?.vehicleNo ||
            r.weighbridge?.vehicleNo,
          gpNo: r.paddyInwardDetails?.gpNo || r.gatePass?.qrCode,
          gpStatus: r.gatePass?.status,
          netWt:
            r.paddyInwardDetails?.netWtAtMill ||
            r.netWeight ||
            r.weighbridge?.netWeight,
          bags: r.paddyInwardDetails?.bagsRecAtMill,
          status: r.status,
          isBackdated: !!(r.paddyInwardDetails as any)?.isBackdated,
          chain,
          chainComplete: chain.length >= 3,
        };
      }),
    };
  }

  /** Plant-Wise Comparison */
  async getPlantWiseComparison() {
    const today = this.startOfDay();
    const plants = await this.prisma.plant.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    const since7 = this.daysAgo(7);

    const mills = await Promise.all(
      plants.map(async (p) => {
        const [
          inwardCount,
          boliPending,
          activeGp,
          paddyStock,
          prodToday,
          yields,
          shortage,
        ] = await Promise.all([
          this.prisma.procurementBatch.count({
            where: {
              plantId: p.id,
              createdAt: { gte: today },
              paddyInwardDetails: { isNot: null },
            },
          }),
          this.prisma.paddyBoli.count({
            where: {
              sodaPending: { plantId: p.id },
              isCancelled: false,
              isCompleted: false,
            },
          }),
          this.prisma.gatePass.count({
            where: { plantId: p.id, status: 'ACTIVE' },
          }),
          this.prisma.inventory.aggregate({
            where: { plantId: p.id, itemType: 'PADDY' },
            _sum: { quantity: true },
          }),
          this.prisma.productionBatch.aggregate({
            where: { plantId: p.id, date: { gte: today } },
            _sum: { paddyUsedQty: true, riceProducedQty: true },
            _count: { _all: true },
          }),
          this.prisma.productionBatch.findMany({
            where: {
              plantId: p.id,
              createdAt: { gte: since7 },
              yieldReport: { isNot: null },
            },
            select: { yieldReport: { select: { overallRecovery: true } } },
            take: 50,
          }),
          this.prisma.procurementBatch.findMany({
            where: {
              plantId: p.id,
              createdAt: { gte: today },
              paddyInwardDetails: { shortageQtl: { gt: 0 } },
            },
            select: {
              paddyInwardDetails: { select: { shortageQtl: true } },
            },
          }),
        ]);

        const ySamples = yields
          .map((y) => y.yieldReport?.overallRecovery)
          .filter((n): n is number => n != null);
        const avgYield =
          ySamples.length > 0
            ? Math.round(
                (ySamples.reduce((a, b) => a + b, 0) / ySamples.length) * 10,
              ) / 10
            : null;
        const shortageQtl = shortage.reduce(
          (s, r) => s + (r.paddyInwardDetails?.shortageQtl || 0),
          0,
        );

        return {
          plantId: p.id,
          plantName: p.name,
          plantCode: p.code,
          inwardToday: inwardCount,
          pendingBolis: boliPending,
          activeGps: activeGp,
          paddyStockMt: paddyStock._sum.quantity || 0,
          productionBatches: prodToday._count._all,
          paddyUsedMt: prodToday._sum.paddyUsedQty || 0,
          riceMt: prodToday._sum.riceProducedQty || 0,
          yieldAvg7d: avgYield,
          shortageQtlToday: Math.round(shortageQtl * 100) / 100,
        };
      }),
    );

    const yields = mills
      .map((m) => m.yieldAvg7d)
      .filter((n): n is number => n != null);
    const avgAll =
      yields.length > 0
        ? yields.reduce((a, b) => a + b, 0) / yields.length
        : null;

    return {
      generatedAt: new Date().toISOString(),
      mills: mills.map((m) => ({
        ...m,
        unusual:
          m.yieldAvg7d != null && avgAll != null && m.yieldAvg7d < avgAll - 3,
      })),
      benchmarkYieldAvg: avgAll != null ? Math.round(avgAll * 10) / 10 : null,
    };
  }

  /** Manual Correction Alerts */
  async getManualCorrectionAlerts(plantId?: string) {
    const since = this.daysAgo(14);
    const pFilter = this.plantFilter(plantId);

    const [backdated, rateCorrected, qualityCuts, auditHits] =
      await Promise.all([
        this.prisma.procurementBatch.findMany({
          where: {
            ...pFilter,
            createdAt: { gte: since },
            paddyInwardDetails: { isBackdated: true },
          },
          include: {
            plant: { select: { name: true, code: true } },
            supplier: { select: { name: true } },
            paddyInwardDetails: true,
          },
          take: 80,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.procurementBatch.findMany({
          where: {
            ...pFilter,
            updatedAt: { gte: since },
            OR: [
              { arhtiaCorrection: { not: null } },
              { nextDayCorrection: { not: null } },
            ],
          },
          include: {
            plant: { select: { name: true, code: true } },
            supplier: { select: { name: true } },
          },
          take: 80,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.gatePass.findMany({
          where: {
            ...pFilter,
            updatedAt: { gte: since },
            qualityCutReason: { not: null },
          },
          include: { plant: { select: { name: true, code: true } } },
          take: 80,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.systemAuditLog.findMany({
          where: {
            createdAt: { gte: since },
            OR: [
              { action: { contains: 'CORRECT', mode: 'insensitive' } },
              { action: { contains: 'BACKDATE', mode: 'insensitive' } },
              { action: { contains: 'MANUAL', mode: 'insensitive' } },
              { details: { contains: 'correct', mode: 'insensitive' } },
              { details: { contains: 'manual', mode: 'insensitive' } },
            ],
            ...(plantId && plantId !== 'global' ? { plantId } : {}),
          },
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 80,
        }),
      ]);

    const alerts = [
      ...backdated.map((r) => ({
        severity: 'warning' as Severity,
        type: 'BackdatedInward',
        plantName: r.plant.name,
        title: 'Manual / backdated paddy inward',
        details: `${r.supplier?.name || '—'} · GP ${r.paddyInwardDetails?.gpNo || '—'}`,
        at: r.createdAt,
        reason: (r.paddyInwardDetails as any)?.entryMadeByName || null,
      })),
      ...rateCorrected.map((r) => ({
        severity: 'critical' as Severity,
        type: 'RateCorrection',
        plantName: r.plant.name,
        title: 'Rate / Artia correction',
        details: `${r.supplier?.name || '—'} · arhtia ${r.arhtiaCorrection ?? '—'} · next-day ${r.nextDayCorrection ?? '—'}`,
        at: r.updatedAt,
        reason: null as string | null,
      })),
      ...qualityCuts.map((g) => ({
        severity: 'warning' as Severity,
        type: 'QualityCut',
        plantName: g.plant.name,
        title: 'Quality cut applied',
        details: `${g.vehicleNo} · ${g.qualityCutReason}`,
        at: g.updatedAt,
        reason: g.qualityCutReason,
      })),
      ...auditHits.map((a) => ({
        severity: 'warning' as Severity,
        type: a.action,
        plantName: '—',
        title: `Audit: ${a.action}`,
        details: a.details || a.module,
        at: a.createdAt,
        reason: a.user?.username,
      })),
    ].sort(
      (a, b) =>
        new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime(),
    );

    return { generatedAt: new Date().toISOString(), alerts };
  }

  /** Overprice Detection — same Artia */
  async getOverpriceDetection(plantId?: string) {
    const since = this.daysAgo(30);
    const where: any = {
      isCancelled: false,
      createdAt: { gte: since },
      sodaPending: plantId && plantId !== 'global' ? { plantId } : undefined,
    };

    const bolis = await this.prisma.paddyBoli.findMany({
      where,
      include: {
        sodaPending: {
          include: {
            plant: { select: { name: true, code: true } },
            supplier: { select: { id: true, name: true, mandi: true } },
          },
        },
      },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    const overpriced = bolis
      .map((b) => {
        const base = b.baseBoliRate ?? b.todayRate;
        const rate = b.rate;
        if (base == null || rate == null) return null;
        const delta = rate - base;
        if (delta <= 0) return null;
        return {
          id: b.id,
          plantName: b.sodaPending.plant.name,
          plantCode: b.sodaPending.plant.code,
          artiaId: b.sodaPending.supplier.id,
          artia: b.sodaPending.supplier.name,
          mandi: b.sodaPending.supplier.mandi,
          boliNo: b.boliNo,
          rate,
          baseRate: base,
          delta: Math.round(delta * 100) / 100,
          moisture: b.moisture,
          bags: b.finalBags != null ? b.finalBags : 0,
          at: b.createdAt,
        };
      })
      .filter(Boolean) as any[];

    const byArtia = new Map<string, any>();
    for (const r of overpriced) {
      const key = `${r.plantCode}|${r.artiaId}`;
      if (!byArtia.has(key)) {
        byArtia.set(key, {
          plantName: r.plantName,
          artia: r.artia,
          mandi: r.mandi,
          count: 0,
          deltaSum: 0,
          maxDelta: 0,
        });
      }
      const a = byArtia.get(key)!;
      a.count += 1;
      a.deltaSum += r.delta;
      a.maxDelta = Math.max(a.maxDelta, r.delta);
    }

    return {
      generatedAt: new Date().toISOString(),
      byArtia: [...byArtia.values()]
        .map((a) => ({
          ...a,
          deltaSum: Math.round(a.deltaSum * 100) / 100,
        }))
        .sort((a, b) => b.count - a.count),
      rows: overpriced,
    };
  }

  /** Weighment Pattern Monitoring */
  async getWeighmentPatterns(plantId?: string) {
    const since = this.daysAgo(7);
    const txs = await this.prisma.weighbridgeTransaction.findMany({
      where: {
        ...this.plantFilter(plantId),
        createdAt: { gte: since },
      },
      include: { plant: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: 800,
    });

    const byTruck = new Map<string, any>();
    for (const t of txs) {
      const key = `${t.plantId}|${(t.vehicleNo || '').toUpperCase().trim()}`;
      if (!byTruck.has(key)) {
        byTruck.set(key, {
          plantName: t.plant.name,
          plantCode: t.plant.code,
          vehicleNo: t.vehicleNo,
          count: 0,
          nets: [] as number[],
          times: [] as Date[],
        });
      }
      const row = byTruck.get(key)!;
      row.count += 1;
      if (t.netWeight != null) row.nets.push(t.netWeight);
      row.times.push(t.createdAt);
    }

    const patterns = [...byTruck.values()]
      .map((r) => {
        const sameNet =
          r.nets.length >= 2 &&
          new Set(r.nets.map((n: number) => Math.round(n * 100) / 100)).size ===
            1;
        const unusual = r.count >= 3 || sameNet;
        return {
          ...r,
          sameNetRepeated: sameNet,
          unusual,
          severity: (r.count >= 5
            ? 'critical'
            : unusual
              ? 'warning'
              : 'normal') as Severity,
          lastAt: r.times[0],
        };
      })
      .filter((r) => r.count >= 2)
      .sort((a, b) => b.count - a.count);

    return {
      generatedAt: new Date().toISOString(),
      patterns,
      unusualCount: patterns.filter((p) => p.unusual).length,
    };
  }

  /** Correction Audit Control — corrections needing reason/approval completeness */
  async getCorrectionAuditControl(plantId?: string) {
    const since = this.daysAgo(30);
    const pFilter = this.plantFilter(plantId);

    const [rateCorr, qualityCuts, backdated, audit] = await Promise.all([
      this.prisma.procurementBatch.findMany({
        where: {
          ...pFilter,
          updatedAt: { gte: since },
          OR: [
            { arhtiaCorrection: { not: null } },
            { nextDayCorrection: { not: null } },
          ],
        },
        include: {
          plant: { select: { name: true, code: true } },
          supplier: { select: { name: true } },
          paddyInwardDetails: true,
        },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.gatePass.findMany({
        where: {
          ...pFilter,
          updatedAt: { gte: since },
          OR: [
            { qualityCutValue: { not: null } },
            { qualityCutReason: { not: null } },
          ],
        },
        include: { plant: { select: { name: true, code: true } } },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.procurementBatch.findMany({
        where: {
          ...pFilter,
          createdAt: { gte: since },
          paddyInwardDetails: { isBackdated: true },
        },
        include: {
          plant: { select: { name: true, code: true } },
          paddyInwardDetails: true,
        },
        take: 100,
      }),
      this.prisma.systemAuditLog.findMany({
        where: {
          createdAt: { gte: since },
          OR: [
            { action: { contains: 'APPROV', mode: 'insensitive' } },
            { action: { contains: 'CORRECT', mode: 'insensitive' } },
          ],
          ...(plantId && plantId !== 'global' ? { plantId } : {}),
        },
        include: { user: { select: { username: true } } },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const rows = [
      ...rateCorr.map((r) => ({
        type: 'RateCorrection',
        plantName: r.plant.name,
        entity: r.supplier?.name || r.id.slice(0, 8),
        reason: null as string | null,
        approval: null as string | null,
        dateTime: r.updatedAt,
        complete: false,
        missing: ['reason', 'approval'],
      })),
      ...qualityCuts.map((g) => ({
        type: 'QualityCut',
        plantName: g.plant.name,
        entity: g.vehicleNo || g.qrCode,
        reason: g.qualityCutReason,
        approval: null as string | null,
        dateTime: g.updatedAt,
        complete: !!g.qualityCutReason,
        missing: [
          ...(!g.qualityCutReason ? ['reason'] : []),
          'approval',
        ],
      })),
      ...backdated.map((r) => {
        const d = r.paddyInwardDetails as any;
        return {
          type: 'BackdatedInward',
          plantName: r.plant.name,
          entity: d?.gpNo || r.id.slice(0, 8),
          reason: d?.entryMadeByName || null,
          approval: null as string | null,
          dateTime: r.createdAt,
          complete: false,
          missing: [...(!d?.entryMadeByName ? ['reason'] : []), 'approval'],
        };
      }),
      ...audit.map((a) => ({
        type: a.action,
        plantName: '—',
        entity: a.entityId || a.module,
        reason: a.details,
        approval: a.user?.username || null,
        dateTime: a.createdAt,
        complete: !!(a.details && a.userId),
        missing: [] as string[],
      })),
    ].sort(
      (a, b) =>
        new Date(b.dateTime ?? 0).getTime() -
        new Date(a.dateTime ?? 0).getTime(),
    );

    return {
      generatedAt: new Date().toISOString(),
      incomplete: rows.filter((r) => !r.complete).length,
      rows,
    };
  }

  /** Audit Logs Tracking — Created / Edited / Deleted / Approved */
  async getAuditLogsTracking(plantId?: string) {
    const since = this.daysAgo(14);
    const logs = await this.prisma.systemAuditLog.findMany({
      where: {
        createdAt: { gte: since },
        ...(plantId && plantId !== 'global' ? { plantId } : {}),
      },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const categorize = (action: string): string => {
      const a = (action || '').toUpperCase();
      if (a.includes('CREAT') || a.includes('ADD') || a.includes('INSERT'))
        return 'Created';
      if (a.includes('DELET') || a.includes('ARCHIV') || a.includes('CANCEL'))
        return 'Deleted';
      if (a.includes('APPROV') || a.includes('REJECT') || a.includes('CONFIRM'))
        return 'Approved';
      if (
        a.includes('UPDATE') ||
        a.includes('EDIT') ||
        a.includes('MODIFY') ||
        a.includes('CORRECT') ||
        a.includes('CHANGE')
      )
        return 'Edited';
      return 'Edited';
    };

    const buckets = {
      Created: [] as any[],
      Edited: [] as any[],
      Deleted: [] as any[],
      Approved: [] as any[],
    };

    for (const l of logs) {
      const cat = categorize(l.action) as keyof typeof buckets;
      buckets[cat].push({
        id: l.id,
        category: cat,
        action: l.action,
        module: l.module,
        details: l.details,
        user: l.user?.username,
        plantId: l.plantId,
        at: l.createdAt,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      counts: {
        Created: buckets.Created.length,
        Edited: buckets.Edited.length,
        Deleted: buckets.Deleted.length,
        Approved: buckets.Approved.length,
      },
      ...buckets,
      all: logs.map((l) => ({
        id: l.id,
        category: categorize(l.action),
        action: l.action,
        module: l.module,
        details: l.details,
        user: l.user?.username,
        at: l.createdAt,
      })),
    };
  }

  /**
   * Transaction Severity Categories
   * 🔴 Critical · 🟠 Warning · 🟢 Normal
   */
  async getTransactionSeverity(plantId?: string) {
    const today = this.startOfDay();
    const since3 = this.daysAgo(3);
    const since7 = this.daysAgo(7);
    const pFilter = this.plantFilter(plantId);
    const items: {
      severity: Severity;
      type: string;
      plantName: string;
      title: string;
      details: string;
      at: Date;
    }[] = [];

    const [
      stockDiff,
      lowYield,
      adjustments,
      overpriceBolis,
      moistureCuts,
      weighMods,
      expenses,
      normalInwards,
    ] = await Promise.all([
      this.prisma.procurementBatch.findMany({
        where: {
          ...pFilter,
          createdAt: { gte: today },
          paddyInwardDetails: { shortageQtl: { gt: 2 } },
        },
        include: {
          plant: { select: { name: true } },
          supplier: { select: { name: true } },
          paddyInwardDetails: true,
        },
        take: 40,
      }),
      this.prisma.productionBatch.findMany({
        where: {
          ...pFilter,
          createdAt: { gte: since7 },
          yieldReport: { overallRecovery: { lt: 60 } },
        },
        include: {
          plant: { select: { name: true } },
          yieldReport: true,
        },
        take: 40,
      }),
      this.prisma.stockLedger.findMany({
        where: {
          ...pFilter,
          createdAt: { gte: since3 },
          transaction: { in: ['ADJUSTMENT', 'ADJUST'] },
        },
        include: { plant: { select: { name: true } } },
        take: 40,
      }),
      this.prisma.paddyBoli.findMany({
        where: {
          isCancelled: false,
          createdAt: { gte: since7 },
          sodaPending: plantId && plantId !== 'global' ? { plantId } : undefined,
        },
        include: {
          sodaPending: {
            include: {
              plant: { select: { name: true } },
              supplier: { select: { name: true } },
            },
          },
        },
        take: 200,
      }),
      this.prisma.gatePass.findMany({
        where: {
          ...pFilter,
          createdAt: { gte: since7 },
          qualityCutValue: { gt: 0 },
        },
        include: { plant: { select: { name: true } } },
        take: 40,
      }),
      this.prisma.weighbridgeTransaction.findMany({
        where: {
          ...pFilter,
          updatedAt: { gte: since3 },
          status: 'COMPLETED',
        },
        include: { plant: { select: { name: true } } },
        take: 100,
      }),
      this.prisma.financeLedgerEntry.findMany({
        where: {
          createdAt: { gte: since7 },
          entryType: 'PAYMENT',
          ...(plantId && plantId !== 'global' ? { plantId } : {}),
        },
        include: { plant: { select: { name: true } } },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.procurementBatch.findMany({
        where: {
          ...pFilter,
          createdAt: { gte: today },
          paddyInwardDetails: { isNot: null },
        },
        include: {
          plant: { select: { name: true } },
          paddyInwardDetails: true,
        },
        take: 30,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    for (const r of stockDiff) {
      const sq = r.paddyInwardDetails?.shortageQtl || 0;
      items.push({
        severity: sq > 5 ? 'critical' : 'warning',
        type: 'PaddyStockDifference',
        plantName: r.plant.name,
        title:
          sq > 5
            ? 'Paddy stock difference > defined tolerance'
            : 'Paddy shortage under watch',
        details: `${r.supplier?.name || '—'} · ${sq} qtl`,
        at: r.createdAt,
      });
    }
    for (const b of lowYield) {
      items.push({
        severity: 'warning',
        type: 'YieldDrop',
        plantName: b.plant.name,
        title: 'Plant yield suddenly falls below historical range',
        details: `Batch ${b.batchNo} · ${b.yieldReport?.overallRecovery}%`,
        at: b.createdAt,
      });
    }
    for (const a of adjustments) {
      items.push({
        severity: 'critical',
        type: 'UnauthorisedStockAdjustment',
        plantName: a.plant.name,
        title: 'Unauthorised stock adjustment',
        details: `${a.itemType} · ${a.quantity} MT · ${a.remarks || a.reference || 'no remarks'}`,
        at: a.createdAt,
      });
    }
    for (const b of overpriceBolis) {
      const base = b.baseBoliRate ?? b.todayRate;
      if (base == null || b.rate == null || b.rate <= base) continue;
      const delta = b.rate - base;
      items.push({
        severity: delta > 50 ? 'critical' : 'warning',
        type: 'UnusualPurchaseRate',
        plantName: b.sodaPending.plant.name,
        title: 'Unusual purchase rate',
        details: `${b.sodaPending.supplier.name} · rate ${b.rate} vs base ${base} (+${Math.round(delta)})`,
        at: b.createdAt,
      });
    }
    for (const g of moistureCuts) {
      items.push({
        severity: 'warning',
        type: 'UnusualMoistureDeduction',
        plantName: g.plant.name,
        title: 'Unusual moisture deduction',
        details: `${g.vehicleNo} · cut ${g.qualityCutValue} ${g.qualityCutType || ''} · ${g.qualityCutReason || ''}`,
        at: g.createdAt,
      });
    }
    // Weighment modified after approval heuristic: updatedAt >> createdAt on completed
    for (const w of weighMods) {
      if (!w.createdAt || !w.updatedAt) continue;
      const lag = w.updatedAt.getTime() - w.createdAt.getTime();
      if (lag < 30 * 60 * 1000) continue;
      items.push({
        severity: 'critical',
        type: 'WeighmentModifiedAfterApproval',
        plantName: w.plant.name,
        title: 'Weighment modified after approval',
        details: `${w.vehicleNo} · modified ${Math.round(lag / 60000)} min after create`,
        at: w.updatedAt,
      });
    }
    for (const e of expenses as any[]) {
      const amt = Number(e.debit || e.credit || 0);
      if (amt < 100000) continue;
      items.push({
        severity: 'warning',
        type: 'UnusualHighExpenses',
        plantName: e.plant?.name || '—',
        title: 'Unusual high expenses',
        details: `PAYMENT · ₹${amt.toLocaleString()}`,
        at: e.createdAt,
      });
    }
    for (const n of normalInwards) {
      const sq = n.paddyInwardDetails?.shortageQtl || 0;
      if (sq > 0.5) continue;
      items.push({
        severity: 'normal',
        type: 'NormalInward',
        plantName: n.plant.name,
        title: 'Normal paddy inward',
        details: `GP ${n.paddyInwardDetails?.gpNo || '—'} · no action required`,
        at: n.createdAt,
      });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      generatedAt: new Date().toISOString(),
      critical: items.filter((i) => i.severity === 'critical'),
      warning: items.filter((i) => i.severity === 'warning'),
      normal: items.filter((i) => i.severity === 'normal'),
      counts: {
        critical: items.filter((i) => i.severity === 'critical').length,
        warning: items.filter((i) => i.severity === 'warning').length,
        normal: items.filter((i) => i.severity === 'normal').length,
      },
    };
  }

  /** Stock Available for Dispatch */
  async getStockAvailableForDispatch(plantId?: string) {
    const where: any = {
      itemType: { in: ['PADDY', 'RICE', 'FINISHED_GOODS'] },
      ...this.plantFilter(plantId),
    };
    // FINISHED_GOODS may be stored as RICE with category — also pull RICE
    const rows = await this.prisma.inventory.findMany({
      where: {
        OR: [
          { ...this.plantFilter(plantId), itemType: 'RICE' },
          { ...this.plantFilter(plantId), itemType: 'FINISHED_GOODS' },
          { ...this.plantFilter(plantId), itemType: 'PADDY' },
        ],
      },
      include: { plant: { select: { name: true, code: true } } },
      orderBy: [{ plant: { name: 'asc' } }, { itemType: 'asc' }],
    });

    const mills = new Map<string, any>();
    for (const r of rows) {
      if (!mills.has(r.plantId)) {
        mills.set(r.plantId, {
          plantId: r.plantId,
          plantName: r.plant.name,
          plantCode: r.plant.code,
          totalQty: 0,
          usable: 0,
          reserved: 0,
          availableForDispatch: 0,
          lines: [] as any[],
        });
      }
      const m = mills.get(r.plantId)!;
      const usable = r.usable ?? r.quantity ?? 0;
      const reserved = r.reserved ?? 0;
      const available = Math.max(0, usable - reserved);
      m.totalQty += r.quantity || 0;
      m.usable += usable;
      m.reserved += reserved;
      m.availableForDispatch += available;
      m.lines.push({
        itemType: r.itemType,
        variety: r.variety,
        godown: r.godown,
        quantity: r.quantity,
        usable,
        reserved,
        availableForDispatch: available,
        unit: r.unit,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      mills: [...mills.values()],
      totalAvailable: [...mills.values()].reduce(
        (s, m) => s + m.availableForDispatch,
        0,
      ),
    };
  }

  /** Receivables Tracking */
  async getReceivablesTracking() {
    const entries = await this.prisma.financeLedgerEntry.findMany({
      where: { entryType: { in: ['SALE', 'RECEIPT'] } },
      include: {
        party: { select: { id: true, name: true } },
        partyPlant: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true, code: true } },
        financeSoda: { select: { sodaNumber: true, sodaType: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    type Acc = {
      partyKey: string;
      partyName: string;
      plantName: string;
      billed: number;
      settled: number;
    };
    const map = new Map<string, Acc>();
    for (const e of entries) {
      const partyName =
        e.party?.name || e.partyPlant?.name || 'Unknown party';
      const key = e.partyId || e.partyPlantId || partyName;
      if (!map.has(key)) {
        map.set(key, {
          partyKey: key,
          partyName,
          plantName: e.plant?.name || e.partyPlant?.name || '—',
          billed: 0,
          settled: 0,
        });
      }
      const acc = map.get(key)!;
      const amt = Number(e.debit || e.credit || 0);
      if (e.entryType === 'SALE') acc.billed += Number(e.debit || 0);
      if (e.entryType === 'RECEIPT') acc.settled += Number(e.credit || 0);
    }

    const rows = [...map.values()]
      .map((p) => ({
        party: p.partyName,
        plantName: p.plantName,
        billed: Math.round(p.billed * 100) / 100,
        settled: Math.round(p.settled * 100) / 100,
        outstanding: Math.round((p.billed - p.settled) * 100) / 100,
      }))
      .filter((p) => Math.abs(p.outstanding) > 0.0005)
      .sort((a, b) => Math.abs(b.outstanding) - Math.abs(a.outstanding));

    return {
      generatedAt: new Date().toISOString(),
      rows,
      total: Math.round(
        rows.reduce((s, r) => s + r.outstanding, 0) * 100,
      ) / 100,
    };
  }

  /** Paddy Cost Tracking */
  async getPaddyCostTracking(plantId?: string) {
    const since = this.daysAgo(30);
    const batches = await this.prisma.procurementBatch.findMany({
      where: {
        ...this.plantFilter(plantId),
        createdAt: { gte: since },
        paddyInwardDetails: { isNot: null },
      },
      include: {
        plant: { select: { name: true, code: true } },
        supplier: { select: { name: true, mandi: true } },
        paddyInwardDetails: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const byMill = new Map<string, any>();
    const rows = batches.map((b) => {
      const bags = b.paddyInwardDetails?.bagsRecAtMill || 0;
      const netWt = b.paddyInwardDetails?.netWtAtMill || b.netWeight || 0;
      const rate = b.finalRate ?? b.baseRate ?? b.paddyInwardDetails?.boliRate ?? 0;
      const cost = rate && netWt ? rate * netWt : b.netAmount || b.amount || 0;
      if (!byMill.has(b.plantId)) {
        byMill.set(b.plantId, {
          plantId: b.plantId,
          plantName: b.plant.name,
          plantCode: b.plant.code,
          totalCost: 0,
          totalMt: 0,
          count: 0,
        });
      }
      const m = byMill.get(b.plantId)!;
      m.totalCost += cost;
      m.totalMt += netWt || 0;
      m.count += 1;
      return {
        id: b.id,
        plantName: b.plant.name,
        artia: b.supplier?.name,
        mandi: b.supplier?.mandi || b.paddyInwardDetails?.mandi,
        bags,
        netWt,
        rate,
        cost: Math.round(cost * 100) / 100,
        at: b.createdAt,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      mills: [...byMill.values()].map((m) => ({
        ...m,
        totalCost: Math.round(m.totalCost * 100) / 100,
        avgCostPerMt:
          m.totalMt > 0
            ? Math.round((m.totalCost / m.totalMt) * 100) / 100
            : null,
      })),
      rows,
    };
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 1 rice consignment = 580 bags */
const RICE_BAGS_PER_CONSIGNMENT = 580;
/** Paddy bags → consignment conversion (govt norm) */
const PADDY_BAGS_PER_CONSIGNMENT = 1154;

const STOCK_HEALTH_MILLS = [
  { key: 'goyal', label: 'Goyal', match: /goyal/i },
  { key: 'beas', label: 'Beas', match: /beas/i },
  { key: 'rajoa', label: 'Rajoa', match: /rajoa/i },
] as const;

const RICE_VARIETY_PATTERNS = [
  /final\s*rice/i,
  /produced\s*rice/i,
  /^rice$/i,
  /mansoori/i,
  /wand/i,
  /parmal/i,
  /frk/i,
];

@Injectable()
export class YieldService {
  constructor(private prisma: PrismaService) {}

  async saveCalculatorData(plantId: string, data: any) {
    if (!data.batchNo) {
      return { success: false, message: 'Batch number is required to save yield report' };
    }

    const batch = await this.prisma.productionBatch.findUnique({
      where: { batchNo: data.batchNo },
    });

    if (!batch) {
      return { success: false, message: 'Batch not found' };
    }

    await this.prisma.productionBatch.update({
      where: { id: batch.id },
      data: {
        riceProducedQty: data.riceProduced || 0,
        status: 'Completed',
        progress: 100,
      },
    });

    const yieldReport = await this.prisma.yieldReport.upsert({
      where: { productionBatchId: batch.id },
      create: {
        productionBatchId: batch.id,
        plantId: plantId,
        headRicePercent: data.headRicePercent || 0,
        brokenRicePercent: data.brokenRicePercent || 0,
        branPercent: data.branPercent || 0,
        huskPercent: data.huskPercent || 0,
        lossPercent: data.lossPercent || 0,
        overallRecovery: data.overallRecovery || 0,
        yieldTarget: 67,
        targetAchieved: (data.overallRecovery || 0) >= 67,
      },
      update: {
        headRicePercent: data.headRicePercent || 0,
        brokenRicePercent: data.brokenRicePercent || 0,
        branPercent: data.branPercent || 0,
        huskPercent: data.huskPercent || 0,
        lossPercent: data.lossPercent || 0,
        overallRecovery: data.overallRecovery || 0,
        targetAchieved: (data.overallRecovery || 0) >= 67,
      },
    });

    return { success: true, data: yieldReport };
  }

  async getAnalytics(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };
    const yieldReports = await this.prisma.yieldReport.findMany({
      where: whereClause,
      include: { batch: true, plant: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!yieldReports.length) {
      return { 
        bestPlant: '-', 
        highestYield: 0, 
        lowestYield: 0, 
        averageYield: 0, 
        predictedYield: 0, 
        latestBatch: null,
        batchStart: null,
        batchEnd: null,
        batchPaddy: 0,
        batchRice: 0,
        batchByProducts: 0,
        batchLoss: 0,
        batchRecovery: 0,
        batchTarget: 0,
        batchAchievement: 0,
        chartData: [],
      };
    }

    let sum = 0;
    let highest = 0;
    let lowest = 100;
    
    yieldReports.forEach((r) => {
      if (r.overallRecovery > highest) highest = r.overallRecovery;
      if (r.overallRecovery < lowest) lowest = r.overallRecovery;
      sum += r.overallRecovery;
    });

    const averageYield = (sum / yieldReports.length).toFixed(2);
    const latest = yieldReports[0];

    return {
      bestPlant: latest.plant.name,
      highestYield: highest.toFixed(2),
      lowestYield: lowest.toFixed(2),
      averageYield,
      predictedYield: averageYield,
      latestBatch: latest.batch.batchNo,
      batchStart: latest.batch.date?.toLocaleString() || '-',
      batchEnd: '-',
      batchPaddy: latest.batch.paddyUsedQty.toFixed(3),
      batchRice: latest.batch.riceProducedQty?.toFixed(3) || '0.000',
      batchByProducts: (
        ((latest.branPercent + latest.huskPercent) / 100) * latest.batch.paddyUsedQty
      ).toFixed(3),
      batchLoss: ((latest.lossPercent / 100) * latest.batch.paddyUsedQty).toFixed(3),
      batchRecovery: latest.overallRecovery.toFixed(2),
      batchTarget: latest.yieldTarget?.toFixed(2) || '65.00',
      batchAchievement: latest.yieldTarget 
        ? ((latest.overallRecovery / latest.yieldTarget) * 100).toFixed(2) 
        : '100.00',
      chartData: yieldReports
        .map((r) => ({
        name: r.batch.batchNo,
        yield: r.overallRecovery,
          date: r.createdAt,
        }))
        .reverse()
        .slice(0, 12),
    };
  }

  async getHistorical(plantId: string, dateFrom?: string, dateTo?: string, variety?: string) {
    const where: any = plantId === 'global' ? {} : { plantId };
    if (dateFrom && dateTo) {
      where.createdAt = { gte: new Date(dateFrom), lte: new Date(dateTo) };
    }
    if (variety && variety !== 'All Varieties' && variety !== '') {
      where.batch = { variety };
    }

    return this.prisma.yieldReport.findMany({
      where,
      include: { batch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Stock Health Report
  // ---------------------------------------------------------------------------

  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private endOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  private isRiceVariety(name?: string | null) {
    if (!name) return false;
    return RICE_VARIETY_PATTERNS.some((p) => p.test(name));
  }

  private resolveAsOfDate(params: { period?: string; dateFrom?: string; dateTo?: string }) {
    const now = new Date();
    const todayEnd = this.endOfDay(now);
    let periodEnd = todayEnd;

    if (params.dateTo) {
      periodEnd = this.endOfDay(new Date(params.dateTo));
    } else if (params.period === 'daily') {
      // Selected day (dateFrom) or today
      periodEnd = params.dateFrom
        ? this.endOfDay(new Date(params.dateFrom))
        : todayEnd;
    } else if (params.period === 'weekly') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff + 6); // Sunday of current week
      periodEnd = this.endOfDay(d);
    } else if (params.period === 'monthly') {
      periodEnd = this.endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }

    // Never project into the future (fixes mid-week / mid-month B including today+)
    return new Date(Math.min(periodEnd.getTime(), todayEnd.getTime()));
  }

  /** Inclusive lower bound for Delivered (B) by period — Feedback 22 weekly/monthly/range */
  private resolveDeliveredFrom(params: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    asOf: Date;
  }): Date | null {
    if (params.dateFrom) return this.startOfDay(new Date(params.dateFrom));
    if (params.period === 'daily') {
      return this.startOfDay(params.asOf);
    }
    if (params.period === 'weekly') {
      const d = new Date(params.asOf);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      return this.startOfDay(d);
    }
    if (params.period === 'monthly') {
      return this.startOfDay(new Date(params.asOf.getFullYear(), params.asOf.getMonth(), 1));
    }
    // till_date: from first consignment (no lower bound)
    return null;
  }

  /**
   * Yield compare window start — Feedback 17.
   * Uses period bounds only (no stock-health "first consignment" null).
   */
  private resolveYieldFrom(params: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    asOf: Date;
  }): Date {
    if (params.dateFrom) return this.startOfDay(new Date(params.dateFrom));
    if (params.period === 'daily') {
      return this.startOfDay(params.asOf);
    }
    if (params.period === 'weekly') {
      const d = new Date(params.asOf);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      return this.startOfDay(d);
    }
    if (params.period === 'monthly') {
      return this.startOfDay(new Date(params.asOf.getFullYear(), params.asOf.getMonth(), 1));
    }
    // till_date / default: epoch (all history)
    return new Date(0);
  }

  /**
   * Yield compare window end — Feedback 17.
   * Does NOT force calendar-yesterday (unlike Stock Health B).
   */
  private resolveYieldUntil(params: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    asOf: Date;
  }): Date {
    if (params.dateTo) return this.endOfDay(new Date(params.dateTo));
    if (params.period === 'daily') {
      // Selected day end (= asOf); default asOf is today when no dateTo
      return this.endOfDay(params.asOf);
    }
    return this.endOfDay(params.asOf);
  }

  /** B upper bound = calendar yesterday, also capped by period asOf (Feedback 22 "till yesterday") */
  private resolveDeliveredUntil(asOf: Date): Date {
    const calendarYesterdayEnd = new Date(this.startOfDay(new Date()).getTime() - 1);
    const periodCap = this.endOfDay(asOf);
    return new Date(Math.min(calendarYesterdayEnd.getTime(), periodCap.getTime()));
  }

  private async resolveMillPlants(millKey?: string) {
    const plants = await this.prisma.plant.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    const mills = STOCK_HEALTH_MILLS.filter(
      (m) => !millKey || millKey === 'all' || m.key === millKey,
    );

    return mills.map((mill) => {
      const plant = plants.find((p) => mill.match.test(p.name) || mill.match.test(p.code));
      return { ...mill, plant: plant || null };
    });
  }

  private async getPaddyBagsInHand(plantId: string) {
    const rows = await this.prisma.inventory.findMany({
      where: { plantId, itemType: 'PADDY' },
    });
    return rows.reduce((sum, r) => sum + (r.quantity || 0), 0);
  }

  private async getRiceBagsInHand(plantId: string) {
    const rows = await this.prisma.inventory.findMany({
      where: {
        plantId,
        OR: [{ itemType: 'RICE' }, { itemType: 'BYPRODUCT' }, { itemType: 'FINISHED_GOODS' }],
      },
    });

    return rows
      .filter((r) => this.isRiceVariety(r.variety) || r.itemType === 'RICE')
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
  }

  /** Delivered till yesterday — completed outward rice (Feedback 22 B); windowed by period */
  private async getDeliveredConsignments(
    plantId: string,
    asOf: Date,
    deliveredFrom: Date | null,
  ) {
    const deliveredUntil = this.resolveDeliveredUntil(asOf);
    const createdAtFilter: any = { lte: deliveredUntil };
    if (deliveredFrom) {
      createdAtFilter.gte = deliveredFrom;
    }

    const passes = await this.prisma.gatePass.findMany({
      where: {
        plantId,
        passType: 'OUTWARD',
        status: { in: ['COMPLETED', 'CLOSED'] },
        createdAt: createdAtFilter,
      },
      include: { items: true },
    });

    let bags = 0;
    for (const pass of passes) {
      // Prefer Total Bags (Main + Shortage) when present — Feedback 20
      const bagTotal =
        ((pass.mainBags || 0) + (pass.shortageBags || 0)) ||
        (pass.noOfBags || 0);

      if (bagTotal > 0) {
        bags += bagTotal;
        continue;
      }

      if (pass.items?.length) {
        for (const item of pass.items) {
          const unit = (item.unit || '').toUpperCase();
          const name = item.itemName || '';
          const isRice =
            this.isRiceVariety(name) ||
            /rice|wand|parmal|mansoori|frk/i.test(name) ||
            name.toUpperCase() === 'RICE';

          if (!isRice && name.toUpperCase() !== 'OTHER') continue;

          if (unit.includes('BAG') || unit === 'BAGS' || unit === 'NOS') {
            bags += item.quantity || 0;
          } else if (unit.includes('QTL') || unit.includes('QUINTAL')) {
            bags += (item.quantity || 0) / 0.5;
          } else {
            bags += item.quantity || 0;
          }
        }
      }
    }

    if (bags === 0) {
      const ledgerWhere: any = {
        plantId,
        transaction: 'OUT',
        createdAt: { lte: deliveredUntil },
        OR: [
          { itemType: { contains: 'RICE', mode: 'insensitive' } },
          { itemType: 'BYPRODUCT' },
        ],
      };
      if (deliveredFrom) {
        ledgerWhere.createdAt.gte = deliveredFrom;
      }
      const ledgers = await this.prisma.stockLedger.findMany({ where: ledgerWhere });
      for (const l of ledgers) {
        const remarks = (l.remarks || '').toLowerCase();
        if (remarks.includes('issued to production')) continue;
        bags += l.quantity || 0;
      }
    }

    return this.round2(bags / RICE_BAGS_PER_CONSIGNMENT);
  }

  private buildRow(input: {
    key: string;
    label: string;
    plantId: string | null;
    plantName: string | null;
    totalWork: number;
    delivered: number;
    paddyBags: number;
    riceBags: number;
  }) {
    const paddyConsignment = this.round2(input.paddyBags / PADDY_BAGS_PER_CONSIGNMENT);
    const riceConsignment = this.round2(input.riceBags / RICE_BAGS_PER_CONSIGNMENT);
    const totalStockInHand = this.round2(paddyConsignment + riceConsignment);
    const dueConsignment = this.round2(input.totalWork - input.delivered);
    const surplusMinus = this.round2(input.delivered + totalStockInHand - input.totalWork);

    return {
      millKey: input.key,
      firm: input.label,
      plantId: input.plantId,
      plantName: input.plantName,
      totalWork: input.totalWork,
      deliveredTillYesterday: input.delivered,
      paddyStockConsignment: paddyConsignment,
      paddyStockBags: this.round2(input.paddyBags),
      riceStockConsignment: riceConsignment,
      riceStockBags: this.round2(input.riceBags),
      totalStockInHand,
      dueConsignment,
      surplusMinus,
      alert: surplusMinus < -1,
    };
  }

  async getStockHealthReport(query: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    mill?: string;
  }) {
    const asOf = this.resolveAsOfDate(query);
    const deliveredFrom = this.resolveDeliveredFrom({
      period: query.period,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      asOf,
    });
    const mills = await this.resolveMillPlants(query.mill);

    const rows: any[] = [];
    for (const mill of mills) {
      if (!mill.plant) {
        rows.push(
          this.buildRow({
            key: mill.key,
            label: mill.label,
            plantId: null,
            plantName: null,
            totalWork: 0,
            delivered: 0,
            paddyBags: 0,
            riceBags: 0,
          }),
        );
        continue;
      }

      const config = await this.prisma.stockHealthConfig.findUnique({
        where: { plantId: mill.plant.id },
      });

      const [paddyBags, riceBags, delivered] = await Promise.all([
        this.getPaddyBagsInHand(mill.plant.id),
        this.getRiceBagsInHand(mill.plant.id),
        this.getDeliveredConsignments(mill.plant.id, asOf, deliveredFrom),
      ]);

      rows.push(
        this.buildRow({
          key: mill.key,
          label: mill.label,
          plantId: mill.plant.id,
          plantName: mill.plant.name,
          totalWork: config?.totalWork ?? 0,
          delivered,
          paddyBags,
          riceBags,
        }),
      );
    }

    const showTotal = !query.mill || query.mill === 'all';
    let total: any = null;
    if (showTotal && rows.length > 1) {
      total = this.buildRow({
        key: 'total',
        label: 'Total',
        plantId: null,
        plantName: null,
        totalWork: rows.reduce((s, r) => s + r.totalWork, 0),
        delivered: rows.reduce((s, r) => s + r.deliveredTillYesterday, 0),
        paddyBags: rows.reduce((s, r) => s + r.paddyStockBags, 0),
        riceBags: rows.reduce((s, r) => s + r.riceStockBags, 0),
      });
      total.firm = 'Total (sum of mills)';
    }

    const dateFromLabel = deliveredFrom
      ? deliveredFrom.toISOString().slice(0, 10)
      : query.dateFrom
        ? query.dateFrom
        : 'First consignment';
    const dateToLabel = query.dateTo ? query.dateTo : asOf.toISOString().slice(0, 10);

    return {
      asOf: asOf.toISOString(),
      dateRangeLabel: `${dateFromLabel} — ${dateToLabel}`,
      period: query.period || 'till_date',
      constants: {
        riceBagsPerConsignment: RICE_BAGS_PER_CONSIGNMENT,
        paddyBagsPerConsignment: PADDY_BAGS_PER_CONSIGNMENT,
      },
      rows,
      total,
      comparable: showTotal,
    };
  }

  async setStockHealthTotalWork(plantId: string, totalWork: number, setBy?: string, role?: string) {
    const roleName = typeof role === 'string' ? role : (role as any)?.name;
    if (roleName && roleName !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only SUPER_ADMIN can set Total Work (A)');
    }
    if (!plantId) throw new BadRequestException('plantId is required');
    if (totalWork == null || Number.isNaN(Number(totalWork)) || Number(totalWork) < 0) {
      throw new BadRequestException('totalWork must be a non-negative number');
    }

    const plant = await this.prisma.plant.findUnique({ where: { id: plantId } });
    if (!plant) throw new NotFoundException('Plant not found');

    return this.prisma.stockHealthConfig.upsert({
      where: { plantId },
      create: {
        plantId,
        totalWork: Number(totalWork),
        setBy: setBy || null,
        setAt: new Date(),
      },
      update: {
        totalWork: Number(totalWork),
        setBy: setBy || null,
        setAt: new Date(),
      },
    });
  }

  /** Daily job: notify SUPER_ADMIN when Surplus/Minus < -1 (e.g. -2, -3; not -0.8) */
  async checkStockHealthAlerts() {
    const report = await this.getStockHealthReport({ mill: 'all' });
    const alerts: any[] = [];

    for (const row of report.rows) {
      if (row.surplusMinus < -1) {
        const title = `Stock Health Alert — ${row.firm}`;
        const message = `${row.firm} Surplus/Minus is ${row.surplusMinus} consignments (below -1). Due: ${row.dueConsignment}, Stock in hand: ${row.totalStockInHand}.`;

        const start = this.startOfDay(new Date());
        const existing = await this.prisma.notification.findFirst({
          where: {
            title,
            role: 'SUPER_ADMIN',
            createdAt: { gte: start },
          },
        });

        if (!existing) {
          await this.prisma.notification.create({
            data: {
              title,
              message,
              type: 'ALERT',
              role: 'SUPER_ADMIN',
            },
          });
          alerts.push({ mill: row.firm, surplusMinus: row.surplusMinus });
        }
      }
    }

    return { checked: report.rows.length, alerts };
  }

  // ─── Feedback 19: Consignment Dispatch Details ────────────────────────────

  async listConsignmentDispatches(plantId: string, dateFrom?: string, dateTo?: string) {
    const where: any = { isNilDay: false }; // hide nil from final report
    if (plantId && plantId !== 'global') where.plantId = plantId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) {
        const t = new Date(dateTo);
        t.setHours(23, 59, 59, 999);
        where.date.lte = t;
      }
    }
    const rows = await this.prisma.consignmentDispatch.findMany({
      where,
      include: { gatePass: { include: { supplier: true } }, plant: true },
      orderBy: { date: 'desc' },
    });

    const totalMainBags = rows.reduce((s, r) => s + (r.mainBags || 0), 0);
    const wagons = this.round2(totalMainBags / RICE_BAGS_PER_CONSIGNMENT);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        date: r.date,
        plantId: r.plantId,
        plantName: r.plant?.name,
        gpNo: r.gatePass?.qrCode || null,
        depoDetails:
          r.gatePass?.partyName ||
          (r.gatePass as any)?.supplier?.name ||
          r.fciGpNo ||
          null,
        fciGpNo: r.fciGpNo,
        consignmentNo: r.consignmentNo,
        mainBags: r.mainBags,
        shortageBags: r.shortageBags,
        netWeightMill: r.netWeightMill ?? r.gatePass?.netWeight,
        fciDepoWeight: r.fciDepoWeight,
        fciPortalWeight: r.fciPortalWeight,
        fciMoisture: r.fciMoisture,
        fciDamage: r.fciDamage,
        fciDiscolour: r.fciDiscolour,
        fciBroken: r.fciBroken,
        submittedBy: r.submittedBy,
        submittedAt: r.submittedAt,
      })),
      summary: {
        totalMainBags,
        wagonsDelivery: wagons, // bags / 580
      },
    };
  }

  async getGatePassesForConsignmentDate(plantId: string, dateStr: string) {
    const start = this.startOfDay(new Date(dateStr));
    const end = this.endOfDay(new Date(dateStr));
    // Feedback 21: Actual dispatch mill does NOT create consignment for transfer GPs
    const gatePasses = await this.prisma.gatePass.findMany({
      where: {
        plantId,
        status: { in: ['COMPLETED', 'CLOSED'] },
        OR: [
          { gpCompleteDate: { gte: start, lte: end } },
          { createdAt: { gte: start, lte: end }, gpCompleteDate: null },
        ],
        AND: [
          {
            OR: [
              { isTransfer: false },
              { isTransfer: true, autoGpOutTicket: { isNot: null } }, // recipient auto OUT only
            ],
          },
        ],
      },
      include: { items: true, supplier: true },
      orderBy: { createdAt: 'asc' },
    });

    // Protocol: GP report "made" if no ACTIVE passes remain for that day
    const activeLeft = await this.prisma.gatePass.count({
      where: {
        plantId,
        status: 'ACTIVE',
        createdAt: { gte: start, lte: end },
      },
    });
    const finalizedNotif = await this.prisma.notification.findFirst({
      where: {
        title: 'Daily GP Report Finalized',
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });
    const gpReportReady = activeLeft === 0 && (gatePasses.length > 0 || !!finalizedNotif);

    return { gatePasses, gpReportReady, activeLeft };
  }

  async submitConsignmentDispatch(plantId: string, data: any) {
    if (!data?.biometricData) {
      throw new BadRequestException('Fingerprint is required to submit Consignment Dispatch.');
    }

    const today = this.startOfDay(new Date());
    const entryDate = data.date ? this.startOfDay(new Date(data.date)) : today;
    const maxBack = new Date(today);
    maxBack.setDate(maxBack.getDate() - 1);
    if (entryDate < maxBack) {
      throw new BadRequestException('Date can be today or max one backdate only.');
    }

    // Protocol: GP report must be ready unless supervisor acknowledges (max 1 backday)
    if (!data.isNilDay) {
      const gpCheck = await this.getGatePassesForConsignmentDate(
        plantId,
        entryDate.toISOString().slice(0, 10),
      );
      if (!gpCheck.gpReportReady && !data.acknowledgeGpReminder) {
        throw new BadRequestException(
          'GP report not finalized for this date. Fill GP report first, or set acknowledgeGpReminder to continue with max one backdate.',
        );
      }
      const ids: string[] = Array.isArray(data.gatePassIds)
        ? data.gatePassIds.filter(Boolean)
        : data.gatePassId
          ? [data.gatePassId]
          : [];
      if (!ids.length && !data.fciGpNo) {
        throw new BadRequestException('Select a Gate Pass or enter FCI GP No.');
      }
      // Primary GP + extras (multi FCI / trucks in one entry)
      if (ids.length) data.gatePassId = ids[0];
      data.extraGatePassIds = ids.length > 1 ? ids.slice(1).join(',') : null;
    }

    let mainBags = Number(data.mainBags) || 0;
    let shortageBags = Number(data.shortageBags) || 0;
    let netWeightMill = data.netWeightMill != null ? Number(data.netWeightMill) : null;

    const allGpIds: string[] = [
      ...(data.gatePassId ? [data.gatePassId] : []),
      ...((data.extraGatePassIds || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean) as string[]),
    ];
    if (allGpIds.length) {
      let sumMain = 0;
      let sumShort = 0;
      let sumWt = 0;
      for (const gid of allGpIds) {
        const gp = await this.prisma.gatePass.findUnique({ where: { id: gid } });
        if (!gp) continue;
        if (gp.isTransfer) {
          const asOriginal = await this.prisma.transferTicket.findFirst({
            where: { originalGpId: gp.id },
          });
          if (asOriginal) {
            throw new BadRequestException(
              'Actual Dispatch Mill does not create Consignment Dispatch for transfer GPs. Recipient mill creates it.',
            );
          }
          // Feedback 21: Recipient creates consignment on receive/confirm date of the transfer
          const asRecipientGp = await this.prisma.transferTicket.findFirst({
            where: {
              OR: [{ autoGpOutId: gp.id }, { autoGpInId: gp.id }],
              status: 'CLOSED',
            },
          });
          if (asRecipientGp) {
            const receiveDay = this.startOfDay(asRecipientGp.updatedAt);
            if (entryDate.getTime() !== receiveDay.getTime()) {
              throw new BadRequestException(
                `Consignment for transfer GPs must be dated on the receive/confirm date (${receiveDay.toISOString().slice(0, 10)}).`,
              );
            }
            data.fromTransferTicket = true;
          }
        }
        sumMain += gp.mainBags || gp.noOfBags || 0;
        sumShort += gp.shortageBags || 0;
        sumWt += gp.netWeight != null ? Number(gp.netWeight) : 0;
      }
      if (!mainBags) mainBags = sumMain;
      if (!shortageBags) shortageBags = sumShort;
      if (netWeightMill == null && sumWt) netWeightMill = sumWt;
    }

    // Cap multi-truck same consignment at 580 bags
    if (data.consignmentNo && !data.isNilDay) {
      const existing = await this.prisma.consignmentDispatch.aggregate({
        where: {
          plantId,
          consignmentNo: data.consignmentNo,
          isNilDay: false,
          ...(data.id ? { id: { not: data.id } } : {}),
        },
        _sum: { mainBags: true },
      });
      const already = existing._sum.mainBags || 0;
      if (already + mainBags > 580) {
        throw new BadRequestException(
          `Consignment ${data.consignmentNo} would exceed 580 bags cap (current ${already} + ${mainBags}).`,
        );
      }
    }

    const payload = {
      plantId,
      date: entryDate,
      isNilDay: !!data.isNilDay,
      gatePassId: data.isNilDay ? null : data.gatePassId || null,
      extraGatePassIds: data.isNilDay ? null : data.extraGatePassIds || null,
      fciGpNo: data.isNilDay ? null : data.fciGpNo || null,
      consignmentNo: data.isNilDay ? null : data.consignmentNo || null,
      mainBags: data.isNilDay ? 0 : mainBags,
      shortageBags: data.isNilDay ? 0 : shortageBags,
      fciMoisture: data.isNilDay ? null : data.fciMoisture != null ? Number(data.fciMoisture) : null,
      fciDamage: data.isNilDay ? null : data.fciDamage != null ? Number(data.fciDamage) : null,
      fciDiscolour: data.isNilDay ? null : data.fciDiscolour != null ? Number(data.fciDiscolour) : null,
      fciBroken: data.isNilDay ? null : data.fciBroken != null ? Number(data.fciBroken) : null,
      fciDepoWeight: data.isNilDay ? null : data.fciDepoWeight != null ? Number(data.fciDepoWeight) : null,
      fciPortalWeight: data.isNilDay ? null : data.fciPortalWeight != null ? Number(data.fciPortalWeight) : null,
      netWeightMill,
      biometricData: data.biometricData,
      submittedBy: data.submittedBy || 'Supervisor',
      submittedAt: new Date(),
      fromTransferTicket: !!data.fromTransferTicket,
    };

    if (data.id) {
      const existing = await this.prisma.consignmentDispatch.findUnique({ where: { id: data.id } });
      if (!existing) throw new NotFoundException('Consignment entry not found');
      const merged: any = { ...payload };
      for (const key of Object.keys(merged)) {
        if (merged[key] == null && (existing as any)[key] != null && key !== 'biometricData') {
          merged[key] = (existing as any)[key];
        }
      }
      return this.prisma.consignmentDispatch.update({ where: { id: data.id }, data: merged });
    }

    return this.prisma.consignmentDispatch.create({ data: payload });
  }

  /** True when a non-nil entry still has blank FCI / identity fields (Feedback 19) */
  private isConsignmentIncomplete(row: {
    isNilDay?: boolean | null;
    fciGpNo?: string | null;
    consignmentNo?: string | null;
    fciMoisture?: number | null;
    fciDamage?: number | null;
    fciDiscolour?: number | null;
    fciBroken?: number | null;
    fciDepoWeight?: number | null;
    fciPortalWeight?: number | null;
  }) {
    if (row.isNilDay) return false;
    const blanks = [
      !row.fciGpNo,
      !row.consignmentNo,
      row.fciMoisture == null,
      row.fciDamage == null,
      row.fciDiscolour == null,
      row.fciBroken == null,
      row.fciDepoWeight == null,
      row.fciPortalWeight == null,
    ];
    return blanks.some(Boolean);
  }

  async checkConsignmentReminders() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStart = this.startOfDay(yesterday);
    const yEnd = this.endOfDay(yesterday);

    const plants = await this.prisma.plant.findMany({ where: { deletedAt: null } });
    for (const plant of plants) {
      const rows = await this.prisma.consignmentDispatch.findMany({
        where: { plantId: plant.id, date: { gte: yStart, lte: yEnd } },
      });
      const missingEntirely = rows.length === 0;
      const incomplete = rows.filter((r) => this.isConsignmentIncomplete(r));
      if (missingEntirely || incomplete.length > 0) {
        const detail = missingEntirely
          ? 'No entry for previous day'
          : `${incomplete.length} incomplete field(s) on previous-day entry`;
        await this.prisma.notification.create({
          data: {
            title: 'Consignment Dispatch Reminder',
            message: `Please fill Consignment Dispatch details for ${plant.name} (${yStart.toDateString()}). ${detail}.`,
            type: 'WARNING',
            role: 'SUPERVISOR',
          },
        });
      }
    }
    return { ok: true };
  }

  // ─── Feedback 17: Yield from Rice / Paddy (consolidated mill compare) ──────

  /** Variety matchers — case-insensitive patterns per Feedback 17 checklist */
  private static readonly YIELD_VARIETY: Record<string, RegExp[]> = {
    'R. Bran': [/r\.?\s*bran/i, /\bbran\b/i],
    'K. Phuck': [/k\.?\s*phuck/i, /kphuck/i],
    'Broken Rice': [/broken/i, /\bkani\b/i],
    'Nakku 1': [/nakku\s*1/i, /nakku1/i],
    'Nakku 2': [/nakku\s*2/i, /nakku2/i],
    'Rejection': [/rejection/i],
    'Final Rice': [/final\s*rice/i, /produced\s*rice/i],
    'Mansoori': [/mansoori/i],
    Wand: [/\bwand\b/i],
    Parmal: [/parmal/i],
    FRK: [/\bfrk\b/i],
    /** Produced / finished rice stock (excludes purchased varieties) */
    'Produced Rice': [/final\s*rice/i, /produced\s*rice/i, /^rice$/i],
  };

  private static readonly PURCHASED_KEYS = ['Mansoori', 'Wand', 'Parmal', 'FRK'] as const;
  private static readonly BYPRODUCT_KEYS = [
    'R. Bran',
    'K. Phuck',
    'Broken Rice',
    'Nakku 1',
    'Nakku 2',
    'Rejection',
    'Final Rice',
  ] as const;

  private matchesYieldVariety(name: string | null | undefined, key: string): boolean {
    if (!name) return false;
    const patterns = YieldService.YIELD_VARIETY[key];
    if (!patterns) return false;
    return patterns.some((p) => p.test(name));
  }

  private matchesAnyYieldVariety(name: string | null | undefined, keys: string[]): boolean {
    return keys.some((k) => this.matchesYieldVariety(name, k));
  }

  private qtyFromGpItem(item: { quantity?: number | null; unit?: string | null }, unit: 'bags' | 'weight') {
    const q = item.quantity || 0;
    const u = (item.unit || '').toUpperCase();
    if (unit === 'weight') {
      if (u.includes('BAG') || u === 'NOS') return q * 0.5; // bags → qtl approx
      return q;
    }
    if (u.includes('QTL') || u.includes('QUINTAL') || u.includes('MT') || u.includes('KG')) {
      if (u.includes('MT')) return q * 20; // MT → bags @ 50kg
      if (u.includes('KG')) return q / 50;
      return q / 0.5; // qtl → bags
    }
    return q;
  }

  private qtyFromGpPass(
    pass: { mainBags?: number | null; shortageBags?: number | null; noOfBags?: number | null; netWeight?: number | null },
    unit: 'bags' | 'weight',
  ) {
    if (unit === 'weight') return Number(pass.netWeight) || 0;
    return ((pass.mainBags || 0) + (pass.shortageBags || 0)) || (pass.noOfBags || 0);
  }

  /** Prefer ConsignmentDispatch.netWeightMill for weight unit (Feedback 17) */
  private async getConsignmentWeightForPass(gatePassId: string): Promise<number | null> {
    try {
      const row = await this.prisma.consignmentDispatch.findFirst({
        where: { gatePassId, isNilDay: false, netWeightMill: { not: null } },
        orderBy: { submittedAt: 'desc' },
      });
      return row?.netWeightMill != null ? Number(row.netWeightMill) : null;
    } catch {
      return null;
    }
  }

  /** Feedback 03 editable targets (TARGETS row) — mill-wise */
  private async loadYieldTargets(plantId: string): Promise<{ paddy: number; rice: number }> {
    try {
      const row = await this.prisma.millYieldBenchmark.findUnique({
        where: { plantId_itemKey: { plantId, itemKey: 'TARGETS' } },
      });
      if (row) {
        return {
          paddy: Number(row.yieldPctPaddy) || 71,
          rice: Number(row.yieldPctRice) || 66.2,
        };
      }
    } catch {
      /* table missing */
    }
    return { paddy: 71, rice: 66.2 };
  }

  private async loadYieldBenchmarks(basis: 'rice' | 'paddy', plantId: string) {
    let benchmarks: any[] = [];
    try {
      benchmarks = await this.prisma.millYieldBenchmark.findMany({
        where: { plantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    } catch {
      benchmarks = [];
    }

    const pctField = basis === 'paddy' ? 'yieldPctPaddy' : 'roundFigRicePct';
    const benchMap: Record<string, number> = {};

    for (const b of benchmarks) {
      const pct = Number(b[pctField]) || 0;
      if (b.itemKey === 'BRAN') benchMap['R. Bran'] = pct;
      if (b.itemKey === 'K_PHUCK') benchMap['K. Phuck'] = pct;
      if (b.itemKey === 'KANI') benchMap['Broken Rice'] = pct;
      if (b.itemKey === 'NAKKU') {
        benchMap['Nakku 1'] = pct;
        benchMap['Nakku 2'] = this.round2(pct / 2);
      }
      if (b.itemKey === 'REJECTION') benchMap['Rejection'] = pct;
      if (b.itemKey === 'NET_RICE') {
        benchMap['Net rice'] = pct;
        benchMap['Net Rice'] = pct;
        // Final Rice uses rice-basis net rice % only when rice basis; on paddy still show net rice bench for Net Rice row
        if (basis === 'rice') benchMap['Final Rice'] = pct;
        else benchMap['Final Rice'] = Number(b.yieldPctPaddy) || pct;
      }
      if (b.itemKey === 'PURCHASED_RICE') {
        const share = this.round2(pct / 4);
        benchMap['Mansoori'] = share;
        benchMap['Wand'] = share;
        benchMap['Parmal'] = share;
        benchMap['FRK'] = share;
        benchMap['Purchased rice'] = pct;
        benchMap['Purchased Rice'] = pct;
      }
      if (b.itemKey === 'PADDY') benchMap['Paddy Used'] = pct;
    }
    return benchMap;
  }

  private inventoryMatchesKeys(
    variety: string | null | undefined,
    itemType: string | null | undefined,
    varietyKeys: string[],
  ): boolean {
    const isProducedOrFinal =
      varietyKeys.includes('Produced Rice') || varietyKeys.includes('Final Rice');
    // Exclude purchased rice from produced/final rice stock
    if (isProducedOrFinal && this.matchesAnyYieldVariety(variety, [...YieldService.PURCHASED_KEYS])) {
      return false;
    }
    if (this.matchesAnyYieldVariety(variety, varietyKeys)) return true;
    if (this.matchesAnyYieldVariety(itemType, varietyKeys)) return true;

    const it = (itemType || '').toUpperCase();
    if (varietyKeys.includes('Produced Rice') || varietyKeys.includes('Final Rice')) {
      if ((it === 'RICE' || it === 'FINISHED_GOODS') && !this.matchesAnyYieldVariety(variety, [...YieldService.PURCHASED_KEYS])) {
        return true;
      }
    }
    if (varietyKeys.includes('R. Bran') && (it.includes('BRAN') || it === 'BYPRODUCT')) {
      // Only count bran-labelled byproduct rows when variety also matches or is empty
      if (!variety || this.matchesYieldVariety(variety, 'R. Bran')) return true;
    }
    return false;
  }

  private convertInventoryQty(quantity: number, invUnit: string | null | undefined, unit: 'bags' | 'weight') {
    let q = quantity || 0;
    const u = (invUnit || '').toUpperCase();
    if (unit === 'weight') {
      if (u.includes('BAG')) return q * 0.5;
      return q;
    }
    if (u.includes('MT')) return q * 20;
    if (u.includes('QTL') || u.includes('QUINTAL')) return q / 0.5;
    if (u.includes('KG')) return q / 50;
    return q;
  }

  /** Operational stock in hand; auto-pick opening from ledger when inventory empty (Feedback 17) */
  private async getOperationalStockInHand(
    plantId: string,
    varietyKeys: string[],
    unit: 'bags' | 'weight',
    from?: Date,
  ): Promise<number> {
    const rows = await this.prisma.inventory.findMany({ where: { plantId } });

    let stock = 0;
    for (const r of rows) {
      const cat = (r.category || 'Operational').trim();
      if (cat && !/^operational$/i.test(cat)) continue; // skip Non-Operational
      if (!this.inventoryMatchesKeys(r.variety, r.itemType, varietyKeys)) continue;
      stock += this.convertInventoryQty(r.quantity || 0, r.unit, unit);
    }

    // Opening balances: ledger before period, skip Non-Operational itemTypes
    if (stock === 0 && from && from.getTime() > 0) {
      const opening = await this.prisma.stockLedger.findMany({
        where: { plantId, createdAt: { lt: from } },
      });
      let openIn = 0;
      let openOut = 0;
      for (const l of opening) {
        if (
          !this.matchesAnyYieldVariety(l.itemType, varietyKeys) &&
          !this.matchesAnyYieldVariety(l.remarks, varietyKeys)
        ) {
          continue;
        }
        const onlyNonOp = rows.some(
          (r) =>
            r.itemType === l.itemType &&
            r.category &&
            !/^operational$/i.test(r.category),
        );
        const hasOp = rows.some(
          (r) =>
            r.itemType === l.itemType &&
            (!r.category || /^operational$/i.test(r.category)),
        );
        if (onlyNonOp && !hasOp) continue;
        if (l.transaction === 'IN') openIn += l.quantity || 0;
        else if (l.transaction === 'OUT') openOut += l.quantity || 0;
      }
      stock = this.round2(Math.max(0, openIn - openOut));
    }

    return this.round2(stock);
  }

  /** OUTWARD completed/closed GP qty matching varieties in window */
  private async getOutwardQty(
    plantId: string,
    from: Date,
    until: Date,
    varietyKeys: string[],
    unit: 'bags' | 'weight',
  ): Promise<number> {
    const passes = await this.prisma.gatePass.findMany({
      where: {
        plantId,
        passType: 'OUTWARD',
        status: { in: ['COMPLETED', 'CLOSED'] },
        createdAt: { gte: from, lte: until },
      },
      include: { items: true },
    });

    let total = 0;
    for (const pass of passes) {
      const mat = pass.material || '';
      let matched = false;
      // Weight: prefer ConsignmentDispatch.netWeightMill (Feedback 17)
      let consignmentWt: number | null = null;
      if (unit === 'weight') {
        consignmentWt = await this.getConsignmentWeightForPass(pass.id);
      }
      if (pass.items?.length) {
        for (const item of pass.items) {
          const name = item.itemName || '';
          if (this.matchesAnyYieldVariety(name, varietyKeys) || this.matchesAnyYieldVariety(mat, varietyKeys)) {
            if (unit === 'weight' && consignmentWt != null && consignmentWt > 0) {
              if (!matched) total += consignmentWt;
            } else {
              total += this.qtyFromGpItem(item, unit);
            }
            matched = true;
          }
        }
      }
      if (!matched && this.matchesAnyYieldVariety(mat, varietyKeys)) {
        if (unit === 'weight' && consignmentWt != null && consignmentWt > 0) {
          total += consignmentWt;
        } else {
          total += this.qtyFromGpPass(pass, unit);
        }
      }
    }

    // Mill usage from ledger OUT (issued to production / usage)
    const ledgers = await this.prisma.stockLedger.findMany({
      where: {
        plantId,
        transaction: 'OUT',
        createdAt: { gte: from, lte: until },
      },
    });
    for (const l of ledgers) {
      const remarks = (l.remarks || '').toLowerCase();
      const isUsage =
        remarks.includes('issued to production') ||
        remarks.includes('usage') ||
        remarks.includes('mill') ||
        remarks.includes('consumed');
      if (
        isUsage &&
        (this.matchesAnyYieldVariety(l.itemType, varietyKeys) ||
          this.matchesAnyYieldVariety(l.remarks, varietyKeys))
      ) {
        total += l.quantity || 0;
      }
    }

    return this.round2(total);
  }

  /** INWARD purchase qty matching varieties in window */
  private async getInwardQty(
    plantId: string,
    from: Date,
    until: Date,
    varietyKeys: string[],
    unit: 'bags' | 'weight',
  ): Promise<number> {
    const passes = await this.prisma.gatePass.findMany({
      where: {
        plantId,
        passType: 'INWARD',
        status: { in: ['COMPLETED', 'CLOSED'] },
        createdAt: { gte: from, lte: until },
      },
      include: { items: true },
    });

    let total = 0;
    for (const pass of passes) {
      const mat = pass.material || '';
      let matched = false;
      if (pass.items?.length) {
        for (const item of pass.items) {
          const name = item.itemName || '';
          if (this.matchesAnyYieldVariety(name, varietyKeys) || this.matchesAnyYieldVariety(mat, varietyKeys)) {
            total += this.qtyFromGpItem(item, unit);
            matched = true;
          }
        }
      }
      if (!matched && this.matchesAnyYieldVariety(mat, varietyKeys)) {
        total += this.qtyFromGpPass(pass, unit);
      }
    }

    const ledgers = await this.prisma.stockLedger.findMany({
      where: {
        plantId,
        transaction: 'IN',
        createdAt: { gte: from, lte: until },
      },
    });
    for (const l of ledgers) {
      if (
        this.matchesAnyYieldVariety(l.itemType, varietyKeys) ||
        this.matchesAnyYieldVariety(l.remarks, varietyKeys)
      ) {
        total += l.quantity || 0;
      }
    }

    return this.round2(total);
  }

  /**
   * Purchased rice usage per item (Mansoori / Wand / Parmal / FRK):
   * (+) Stock in Hand + (+) Sale + Dispatch + Usage = Stock Usage
   */
  private async getPurchasedItemUsage(
    plantId: string,
    itemKey: string,
    from: Date,
    until: Date,
    unit: 'bags' | 'weight',
  ): Promise<number> {
    const stock = await this.getOperationalStockInHand(plantId, [itemKey], unit, from);
    const out = await this.getOutwardQty(plantId, from, until, [itemKey], unit);
    return this.round2(stock + out);
  }

  /**
   * By-product / Final Rice net produced:
   * (+) Stock in Hand + (+) Sale + Usage − (−) Purchase + Inward
   */
  private async getByProductNetProduced(
    plantId: string,
    itemKey: string,
    from: Date,
    until: Date,
    unit: 'bags' | 'weight',
  ): Promise<number> {
    const stock = await this.getOperationalStockInHand(plantId, [itemKey], unit, from);
    const out = await this.getOutwardQty(plantId, from, until, [itemKey], unit);
    const inward = await this.getInwardQty(plantId, from, until, [itemKey], unit);
    return this.round2(stock + out - inward);
  }

  /**
   * Net Rice Produced:
   * (+) Produced Rice Stock in Hand + (+) Sales/Dispatch − (−) Purchased Rice Used
   */
  private async getNetRiceProduced(
    plantId: string,
    from: Date,
    until: Date,
    unit: 'bags' | 'weight',
    purchasedUsed: number,
  ): Promise<number> {
    const stock = await this.getOperationalStockInHand(plantId, ['Produced Rice', 'Final Rice'], unit, from);
    // Sales/Dispatch for produced rice (exclude double-counting purchased sales in net formula)
    const riceSales = await this.getOutwardQty(plantId, from, until, ['Produced Rice', 'Final Rice'], unit);
    return this.round2(stock + riceSales - purchasedUsed);
  }

  /** ProductionBatch bags only (no IntermillBatch table) */
  private async getProductionBatchOnly(
    plantId: string,
    from: Date,
    until: Date,
  ): Promise<Record<string, number>> {
    const batches = await this.prisma.productionBatch.findMany({
      where: {
        plantId,
        date: { gte: from, lte: until },
        productionState: { in: ['RICE_MILLING', 'INTERMILL_PROCESSING', 'PADDY_DRYING'] },
      },
    });
    const sum = (fn: (b: any) => number) =>
      this.round2(batches.reduce((s, b) => s + (fn(b) || 0), 0));
    return {
      'R. Bran': sum((b) => b.rBranBags),
      'K. Phuck': sum((b) => b.kPhuckBags),
      'Broken Rice': sum((b) => b.brokenRiceBags),
      'Nakku 1': sum((b) => b.nakku1Bags),
      'Nakku 2': sum((b) => b.nakku2Bags),
      Rejection: sum((b) => b.rejectionBags),
      'Final Rice': sum((b) => b.finalRiceBags),
      Mansoori: sum((b) => b.mansooriBags),
      Wand: sum((b) => (b.wandBags || 0) + (b.wandProducedBags || 0)),
      Parmal: sum((b) => b.parmalBags),
      FRK: sum((b) => b.frkBags),
      paddyUsed: sum((b) => b.paddyUsedQty),
    };
  }

  /** IntermillBatch outputs — always added to daily yield (Feedback 17) */
  private async getIntermillOnly(
    plantId: string,
    from: Date,
    until: Date,
  ): Promise<Record<string, number>> {
    const base: Record<string, number> = {};
    try {
      const intermills = await this.prisma.intermillBatch.findMany({
        where: {
          plantId,
          date: { gte: from, lte: until },
          status: { in: ['COMPLETED', 'PENDING_APPROVAL'] },
        },
        include: { outputs: { include: { product: true } } },
      });
      for (const ib of intermills) {
        if (ib.status === 'PENDING_APPROVAL') continue; // only completed effect
        for (const out of ib.outputs || []) {
          const name = (out.product as any)?.name || '';
          const bags = Number(out.outputBags) || 0;
          const key = this.matchYieldItemKey(name);
          if (key) base[key] = this.round2((base[key] || 0) + bags);
        }
      }
    } catch {
      /* optional */
    }
    return base;
  }

  private async getProductionBatchFallback(
    plantId: string,
    from: Date,
    until: Date,
  ): Promise<Record<string, number>> {
    const base = await this.getProductionBatchOnly(plantId, from, until);
    const inter = await this.getIntermillOnly(plantId, from, until);
    for (const [k, v] of Object.entries(inter)) {
      base[k] = this.round2((base[k] || 0) + v);
    }
    return base;
  }

  private matchYieldItemKey(name: string): string | null {
    const n = (name || '').toLowerCase();
    // Feedback 51 — Safai Dust and Patal are wastage stock, not yield lines
    if (/safai/.test(n) || /\bpatal\b/.test(n)) return null;
    if (/bran|r\.?\s*bran/.test(n)) return 'R. Bran';
    if (/phuck|k\.?\s*phuck/.test(n)) return 'K. Phuck';
    if (/broken|kani/.test(n)) return 'Broken Rice';
    if (/nakku\s*2/.test(n)) return 'Nakku 2';
    if (/nakku/.test(n)) return 'Nakku 1';
    if (/reject/.test(n)) return 'Rejection';
    if (/final\s*rice|head\s*rice/.test(n)) return 'Final Rice';
    if (/mansoori/.test(n)) return 'Mansoori';
    if (/wand/.test(n)) return 'Wand';
    if (/parmal/.test(n)) return 'Parmal';
    if (/frk/.test(n)) return 'FRK';
    return null;
  }

  private async getPaddyUsedForPeriod(plantId: string, from: Date, until: Date): Promise<number> {
    const usages = await this.prisma.paddyUsageRecord.findMany({
      where: {
        plantId,
        weekStart: { lte: until },
        weekEnd: { gte: from },
      },
    });
    if (usages.length) {
      return this.round2(usages.reduce((s, u) => s + (u.totalUsed || 0), 0));
    }
    const fallback = await this.getProductionBatchFallback(plantId, from, until);
    return fallback.paddyUsed || 0;
  }

  private cell(qty: number, pct: number, bench: number) {
    return {
      qty: this.round2(qty),
      avg: this.round2(pct), // UI: avg displays % age as per yield when showing yield %
      pct: this.round2(pct),
      diff: this.round2(pct - (bench || 0)),
    };
  }

  private async buildMillYieldItems(opts: {
    plantId: string;
    basis: 'rice' | 'paddy';
    from: Date;
    until: Date;
    unit: 'bags' | 'weight';
    itemKeys: string[];
    benchMap: Record<string, number>;
  }) {
    const { plantId, basis, from, until, unit, itemKeys, benchMap } = opts;
    const batchOnly = await this.getProductionBatchOnly(plantId, from, until);
    const intermill = await this.getIntermillOnly(plantId, from, until);
    const fallback = { ...batchOnly };
    for (const [k, v] of Object.entries(intermill)) {
      fallback[k] = this.round2((fallback[k] || 0) + v);
    }

    // Purchased rice usage (sum of 4)
    const purchasedParts: Record<string, number> = {};
    let purchasedUsed = 0;
    for (const key of YieldService.PURCHASED_KEYS) {
      let usage = await this.getPurchasedItemUsage(plantId, key, from, until, unit);
      if (usage === 0 && fallback[key]) usage = fallback[key];
      purchasedParts[key] = usage;
      purchasedUsed += usage;
    }
    purchasedUsed = this.round2(purchasedUsed);

    // By-products: stock formula OR batch fallback, then ALWAYS + intermill (Feedback 17 daily)
    const nets: Record<string, number> = {};
    for (const key of YieldService.BYPRODUCT_KEYS) {
      let net = await this.getByProductNetProduced(plantId, key, from, until, unit);
      if (net === 0 && batchOnly[key]) net = batchOnly[key];
      net = this.round2(net + (intermill[key] || 0));
      nets[key] = net;
    }

    // Net rice produced (denominator for rice basis)
    let netRice = await this.getNetRiceProduced(plantId, from, until, unit, purchasedUsed);
    if (netRice === 0) {
      const fromBatch =
        (fallback['Final Rice'] || 0) +
        (fallback['Broken Rice'] || 0) +
        (fallback['Nakku 1'] || 0) +
        (fallback['Nakku 2'] || 0) +
        (fallback.Rejection || 0) -
        purchasedUsed;
      // Prefer final rice bags as produced proxy when stock path empty
      netRice = fallback['Final Rice']
        ? this.round2(fallback['Final Rice'] - purchasedUsed)
        : this.round2(Math.max(0, fromBatch));
      if (netRice <= 0 && fallback['Final Rice']) netRice = fallback['Final Rice'];
    }

    const paddyUsed = basis === 'paddy' ? await this.getPaddyUsedForPeriod(plantId, from, until) : 0;
    const denominator = basis === 'paddy' ? paddyUsed : netRice;

    const items: Record<string, { qty: number; avg: number; pct: number; diff: number }> = {};

    for (const label of itemKeys) {
      if (label === 'Paddy Used') {
        items[label] = { qty: paddyUsed, avg: paddyUsed, pct: paddyUsed > 0 ? 100 : 0, diff: 0 };
        continue;
      }
      if (label === 'Net rice' || label === 'Net Rice') {
        const pct =
          basis === 'rice'
            ? netRice > 0
              ? 100
              : 0
            : denominator > 0
              ? this.round2((netRice / denominator) * 100)
              : 0;
        items[label] = this.cell(netRice, pct, benchMap[label] ?? benchMap['Net rice'] ?? 0);
        continue;
      }
      if ((YieldService.PURCHASED_KEYS as readonly string[]).includes(label)) {
        const qty = purchasedParts[label] || 0;
        const pct = denominator > 0 ? this.round2((qty / denominator) * 100) : 0;
        items[label] = this.cell(qty, pct, benchMap[label] ?? 0);
        continue;
      }
      const qty = nets[label] ?? 0;
      const pct = denominator > 0 ? this.round2((qty / denominator) * 100) : 0;
      items[label] = this.cell(qty, pct, benchMap[label] ?? 0);
    }

    const wastage = await this.getWastageAccounted(plantId, from, until);
    return { items, netRice, purchasedUsed, paddyUsed, denominator, wastage };
  }

  /** Feedback 51 — mill average bag weight turns Safai Dust + Patal bags into quintals. Not a yield item. */
  private async getWastageAccounted(plantId: string, from: Date, until: Date) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      select: { wastageBagWeight: true, standardBagWeight: true },
    });
    const set = Number(plant?.wastageBagWeight);
    const standard = Number(plant?.standardBagWeight);
    const bagWeightQtl =
      Number.isFinite(set) && set > 0
        ? set
        : Number.isFinite(standard) && standard > 0
          ? standard
          : 0.382;
    const [prod, inter] = await Promise.all([
      this.prisma.productionBatch.aggregate({
        where: { plantId, date: { gte: from, lte: until } },
        _sum: { safaiDustBags: true, patalBags: true },
      }),
      this.prisma.intermillBatch.aggregate({
        where: {
          plantId,
          date: { gte: from, lte: until },
          status: { in: ['COMPLETED', 'PENDING_APPROVAL'] },
        },
        _sum: { safaiDustBags: true, patalBags: true },
      }),
    ]);
    const safaiDustBags =
      Number(prod._sum.safaiDustBags || 0) + Number(inter._sum.safaiDustBags || 0);
    const patalBags = Number(prod._sum.patalBags || 0) + Number(inter._sum.patalBags || 0);
    const bags = safaiDustBags + patalBags;
    return {
      safaiDustBags,
      patalBags,
      bags,
      bagWeightQtl,
      weightQtl: Number((bags * bagWeightQtl).toFixed(3)),
    };
  }

  async getMillYieldCompare(params: {
    basis: 'rice' | 'paddy';
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    unit?: 'bags' | 'weight';
  }) {
    const period = params.period || 'daily';
    // daily without dateTo → today
    const query = {
      ...params,
      period,
      ...(period === 'daily' && !params.dateTo && !params.dateFrom
        ? {}
        : {}),
    };
    const asOf = this.resolveAsOfDate(query);
    const from = this.resolveYieldFrom({ ...query, asOf });
    const until = this.resolveYieldUntil({ ...query, asOf });
    const unit = params.unit || 'bags';
    const basis = params.basis || 'rice';

    const mills = await this.resolveMillPlants('all');

    const itemKeys =
      basis === 'rice'
        ? [
            'R. Bran',
            'K. Phuck',
            'Broken Rice',
            'Nakku 1',
            'Nakku 2',
            'Rejection',
            'Final Rice',
            'Mansoori',
            'Wand',
            'Parmal',
            'FRK',
            'Net rice',
          ]
        : [
            'Paddy Used',
            'R. Bran',
            'K. Phuck',
            'Broken Rice',
            'Nakku 1',
            'Nakku 2',
            'Rejection',
            'Final Rice',
            'Mansoori',
            'Wand',
            'Parmal',
            'FRK',
            'Net Rice',
          ];

    const columns: any[] = [];
    let firstBenchMap: Record<string, number> = {};
    let firstTargets = { paddy: 71, rice: 66.2 };
    for (const mill of mills) {
      if (!mill.plant) {
        columns.push({ millKey: mill.key, firm: mill.label, plantId: null, items: {} });
        continue;
      }
      const benchMap = await this.loadYieldBenchmarks(basis, mill.plant.id);
      const targets = await this.loadYieldTargets(mill.plant.id);
      if (!Object.keys(firstBenchMap).length) {
        firstBenchMap = benchMap;
        firstTargets = targets;
      }
      const built = await this.buildMillYieldItems({
        plantId: mill.plant.id,
        basis,
        from,
        until,
        unit,
        itemKeys,
        benchMap,
      });
      columns.push({
        millKey: mill.key,
        firm: mill.label,
        plantId: mill.plant.id,
        items: built.items,
        netRiceProduced: built.netRice,
        purchasedRiceUsed: built.purchasedUsed,
        paddyUsed: built.paddyUsed,
        wastage: built.wastage,
        benchmarks: benchMap,
        targets,
      });
    }

    return {
      basis,
      unit,
      period,
      dateRangeLabel: `${from.toISOString().slice(0, 10)} — ${until.toISOString().slice(0, 10)}`,
      dateFrom: from.toISOString().slice(0, 10),
      dateTo: until.toISOString().slice(0, 10),
      itemKeys,
      benchmarks: firstBenchMap,
      mills: columns,
      targets: firstTargets,
    };
  }

  /** Format 1 — Each Page Report: one mill-compare slice per day/week/month in range */
  async getMillYieldCompareFormat1(params: {
    basis: 'rice' | 'paddy';
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    unit?: 'bags' | 'weight';
    granularity?: 'day' | 'week' | 'month';
  }) {
    const basis = params.basis || 'rice';
    const unit = params.unit || 'bags';
    const asOf = this.resolveAsOfDate({
      period: params.period || 'range',
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    const rangeFrom = params.dateFrom
      ? this.startOfDay(new Date(params.dateFrom))
      : this.resolveYieldFrom({ period: params.period || 'monthly', dateFrom: params.dateFrom, dateTo: params.dateTo, asOf });
    const rangeUntil = params.dateTo
      ? this.endOfDay(new Date(params.dateTo))
      : this.resolveYieldUntil({ period: params.period || 'monthly', dateFrom: params.dateFrom, dateTo: params.dateTo, asOf });

    let granularity: 'day' | 'week' | 'month' =
      params.granularity ||
      (params.period === 'weekly' ? 'week' : params.period === 'monthly' ? 'month' : 'day');

    const slices: { label: string; dateFrom: string; dateTo: string; report: any }[] = [];
    const cursor = new Date(rangeFrom);

    while (cursor.getTime() <= rangeUntil.getTime()) {
      let sliceFrom = this.startOfDay(cursor);
      let sliceUntil: Date;
      let label: string;

      if (granularity === 'week') {
        const day = cursor.getDay();
        const diff = day === 0 ? 6 : day - 1;
        sliceFrom = this.startOfDay(new Date(cursor));
        sliceFrom.setDate(sliceFrom.getDate() - diff);
        if (sliceFrom < rangeFrom) sliceFrom = this.startOfDay(rangeFrom);
        sliceUntil = this.endOfDay(new Date(sliceFrom));
        sliceUntil.setDate(sliceUntil.getDate() + 6);
        if (sliceUntil > rangeUntil) sliceUntil = this.endOfDay(rangeUntil);
        label = `Week ${sliceFrom.toISOString().slice(0, 10)}`;
        cursor.setTime(sliceUntil.getTime() + 1);
      } else if (granularity === 'month') {
        sliceFrom = this.startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
        if (sliceFrom < rangeFrom) sliceFrom = this.startOfDay(rangeFrom);
        sliceUntil = this.endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
        if (sliceUntil > rangeUntil) sliceUntil = this.endOfDay(rangeUntil);
        label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        cursor.setMonth(cursor.getMonth() + 1, 1);
        cursor.setHours(0, 0, 0, 0);
      } else {
        sliceUntil = this.endOfDay(cursor);
        if (sliceUntil > rangeUntil) sliceUntil = this.endOfDay(rangeUntil);
        label = sliceFrom.toISOString().slice(0, 10);
        cursor.setDate(cursor.getDate() + 1);
      }

      const df = sliceFrom.toISOString().slice(0, 10);
      const dt = sliceUntil.toISOString().slice(0, 10);
      const report = await this.getMillYieldCompare({
        basis,
        unit,
        period: 'till_date',
        dateFrom: df,
        dateTo: dt,
      });
      slices.push({ label, dateFrom: df, dateTo: dt, report });

      // safety: avoid infinite loop
      if (slices.length > 400) break;
    }

    return {
      format: 'page',
      basis,
      unit,
      granularity,
      dateRangeLabel: `${rangeFrom.toISOString().slice(0, 10)} — ${rangeUntil.toISOString().slice(0, 10)}`,
      pages: slices,
    };
  }

  /** Format 2 — Full Datesheet: rows = dates, columns = items, for one mill */
  async getMillYieldCompareFormat2(params: {
    basis: 'rice' | 'paddy';
    plantId?: string;
    millKey?: string;
    dateFrom?: string;
    dateTo?: string;
    unit?: 'bags' | 'weight';
    granularity?: 'day' | 'week' | 'month';
  }) {
    const basis = params.basis || 'rice';
    const unit = params.unit || 'bags';
    const granularity = params.granularity || 'day';

    if (!params.dateFrom || !params.dateTo) {
      throw new BadRequestException('dateFrom and dateTo are required for Format 2');
    }

    const mills = await this.resolveMillPlants(params.millKey || 'all');
    let mill = mills.find((m) => m.plant && (params.plantId ? m.plant.id === params.plantId : true));
    if (params.millKey && params.millKey !== 'all') {
      mill = mills.find((m) => m.key === params.millKey) || mill;
    }
    if (params.plantId) {
      mill = mills.find((m) => m.plant?.id === params.plantId) || mill;
    }
    if (!mill?.plant) {
      throw new BadRequestException('Mill / plant not found for Format 2');
    }

    const benchMap = await this.loadYieldBenchmarks(basis, mill.plant.id);
    const targets = await this.loadYieldTargets(mill.plant.id);

    // Table 03/04 columns
    const itemKeys =
      basis === 'rice'
        ? [
            'R. Bran',
            'K. Phuck',
            'Broken Rice',
            'Nakku 1',
            'Nakku 2',
            'Rejection',
            'Final Rice',
            'Purchased rice',
            'Net rice',
          ]
        : [
            'Paddy Used',
            'R. Bran',
            'K. Phuck',
            'Broken Rice',
            'Nakku 1',
            'Nakku 2',
            'Rejection',
            'Final Rice',
            'Purchased rice',
            'Net Rice',
          ];

    const rangeFrom = this.startOfDay(new Date(params.dateFrom));
    const rangeUntil = this.endOfDay(new Date(params.dateTo));
    const rows: any[] = [];
    const sums: Record<string, number> = {};
    for (const k of itemKeys) sums[k] = 0;
    const pctSums: Record<string, number> = {};
    for (const k of itemKeys) pctSums[k] = 0;
    let sliceCount = 0;

    const cursor = new Date(rangeFrom);
    while (cursor.getTime() <= rangeUntil.getTime()) {
      let sliceFrom = this.startOfDay(cursor);
      let sliceUntil: Date;
      let label: string;

      if (granularity === 'week') {
        const day = cursor.getDay();
        const diff = day === 0 ? 6 : day - 1;
        sliceFrom = this.startOfDay(new Date(cursor));
        sliceFrom.setDate(sliceFrom.getDate() - diff);
        if (sliceFrom < rangeFrom) sliceFrom = this.startOfDay(rangeFrom);
        sliceUntil = this.endOfDay(new Date(sliceFrom));
        sliceUntil.setDate(sliceUntil.getDate() + 6);
        if (sliceUntil > rangeUntil) sliceUntil = this.endOfDay(rangeUntil);
        label = `Week ${sliceFrom.toISOString().slice(0, 10)}`;
        cursor.setTime(sliceUntil.getTime() + 1);
      } else if (granularity === 'month') {
        sliceFrom = this.startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
        if (sliceFrom < rangeFrom) sliceFrom = this.startOfDay(rangeFrom);
        sliceUntil = this.endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
        if (sliceUntil > rangeUntil) sliceUntil = this.endOfDay(rangeUntil);
        label = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        cursor.setMonth(cursor.getMonth() + 1, 1);
        cursor.setHours(0, 0, 0, 0);
      } else {
        sliceUntil = this.endOfDay(cursor);
        label = sliceFrom.toISOString().slice(0, 10);
        cursor.setDate(cursor.getDate() + 1);
      }

      const fullKeys =
        basis === 'rice'
          ? [
              'R. Bran',
              'K. Phuck',
              'Broken Rice',
              'Nakku 1',
              'Nakku 2',
              'Rejection',
              'Final Rice',
              'Mansoori',
              'Wand',
              'Parmal',
              'FRK',
              'Net rice',
            ]
          : [
              'Paddy Used',
              'R. Bran',
              'K. Phuck',
              'Broken Rice',
              'Nakku 1',
              'Nakku 2',
              'Rejection',
              'Final Rice',
              'Mansoori',
              'Wand',
              'Parmal',
              'FRK',
              'Net Rice',
            ];

      const built = await this.buildMillYieldItems({
        plantId: mill.plant.id,
        basis,
        from: sliceFrom,
        until: sliceUntil,
        unit,
        itemKeys: fullKeys,
        benchMap,
      });

      const rowItems: Record<string, { qty: number; pct: number }> = {};
      for (const k of itemKeys) {
        if (k === 'Purchased rice') {
          const qty = built.purchasedUsed;
          const pct =
            built.denominator > 0 ? this.round2((qty / built.denominator) * 100) : 0;
          rowItems[k] = { qty, pct };
          sums[k] += qty;
          pctSums[k] += pct;
        } else {
          const cell = built.items[k] || { qty: 0, pct: 0 };
          rowItems[k] = { qty: cell.qty, pct: cell.pct };
          sums[k] += cell.qty || 0;
          pctSums[k] += cell.pct || 0;
        }
      }
      rows.push({ date: label, items: rowItems, wastage: built.wastage });
      sliceCount++;
      if (sliceCount > 400) break;
    }

    const averageYield: Record<string, number> = {};
    const diffInYield: Record<string, number> = {};
    for (const k of itemKeys) {
      const avgPct = sliceCount ? this.round2(pctSums[k] / sliceCount) : 0;
      averageYield[k] = avgPct;
      const bench = benchMap[k] ?? benchMap['Net rice'] ?? 0;
      diffInYield[k] = this.round2(avgPct - bench);
    }

    return {
      format: 'datesheet',
      basis,
      unit,
      granularity,
      millKey: mill.key,
      firm: mill.label,
      plantId: mill.plant.id,
      dateRangeLabel: `${params.dateFrom} — ${params.dateTo}`,
      itemKeys,
      benchmarks: benchMap,
      rows,
      averageYield,
      diffInYield,
      targets,
    };
  }

  async getPaddyUsagePreview(plantId: string) {
    const invRows = await this.prisma.inventory.findMany({
      where: {
        plantId,
        itemType: 'PADDY',
        OR: [{ category: null }, { category: 'Operational' }, { category: { equals: 'Operational', mode: 'insensitive' } }],
      },
    });
    const stockInHand = invRows.reduce((s, r) => s + (r.quantity || 0), 0);

    const openingLedgers = await this.prisma.stockLedger.findMany({
      where: { plantId, itemType: 'PADDY', transaction: 'IN' },
    });
    const openingStock = openingLedgers.reduce((s, l) => s + (l.quantity || 0), 0);

    const outPasses = await this.prisma.gatePass.findMany({
      where: {
        plantId,
        passType: 'OUTWARD',
        status: { in: ['COMPLETED', 'CLOSED'] },
      },
      include: { items: true },
    });
    let paddyDispatched = 0;
    for (const p of outPasses) {
      const mat = (p.material || '').toUpperCase();
      const itemHit = p.items?.some((i) => /paddy/i.test(i.itemName || ''));
      if (!itemHit && !mat.includes('PADDY')) continue;
      paddyDispatched +=
        ((p.mainBags || 0) + (p.shortageBags || 0)) || (p.noOfBags || 0);
    }

    return {
      openingStock,
      stockInHand,
      paddyDispatched,
    };
  }

  async submitPaddyUsage(plantId: string, data: any) {
    if (!data?.biometricData) {
      throw new BadRequestException('Fingerprint required for Paddy usage submission.');
    }
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const weekStart = this.startOfDay(new Date(now));
    weekStart.setDate(weekStart.getDate() - diff);
    const weekEnd = this.endOfDay(new Date(weekStart));
    weekEnd.setDate(weekEnd.getDate() + 6);

    const preview = await this.getPaddyUsagePreview(plantId);
    const hoodi = Number(data.paddyInHoodi) || 0;
    const dryer = Number(data.paddyInDryer) || 0;
    const silos = Number(data.paddyInSilos) || 0;
    const totalUsed = this.round2(
      (preview.openingStock || 0) -
        (preview.stockInHand || 0) -
        (preview.paddyDispatched || 0) +
        hoodi +
        dryer +
        silos,
    );

    return this.prisma.paddyUsageRecord.upsert({
      where: { plantId_weekStart: { plantId, weekStart } },
      create: {
        plantId,
        weekStart,
        weekEnd,
        openingStock: preview.openingStock,
        stockInHand: preview.stockInHand,
        paddyDispatched: preview.paddyDispatched,
        paddyInHoodi: hoodi,
        paddyInDryer: dryer,
        paddyInSilos: silos,
        totalUsed,
        biometricData: data.biometricData,
        submittedBy: data.submittedBy || 'Supervisor',
        submittedAt: new Date(),
      },
      update: {
        openingStock: preview.openingStock,
        stockInHand: preview.stockInHand,
        paddyDispatched: preview.paddyDispatched,
        paddyInHoodi: hoodi,
        paddyInDryer: dryer,
        paddyInSilos: silos,
        totalUsed,
        biometricData: data.biometricData,
        submittedBy: data.submittedBy || 'Supervisor',
        submittedAt: new Date(),
        weekEnd,
      },
    });
  }
}

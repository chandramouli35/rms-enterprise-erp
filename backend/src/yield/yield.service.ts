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
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

/** Feedback 51 — Safai Dust and Patal. Bags in stock; weight from the mill average. */
@Injectable()
export class WastageRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  wholeBags(raw: unknown, label: string): number {
    if (raw == null || raw === '') return 0;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      throw new BadRequestException(`${label} must be a whole number of bags`);
    }
    return n;
  }

  bagWeightQtl(plant?: { wastageBagWeight?: number | null; standardBagWeight?: number | null } | null) {
    const set = Number(plant?.wastageBagWeight);
    if (Number.isFinite(set) && set > 0) return set;
    const standard = Number(plant?.standardBagWeight);
    if (Number.isFinite(standard) && standard > 0) return standard;
    return 0.382;
  }

  weightQtl(bags: number, bagWeight: number) {
    return Number((bags * bagWeight).toFixed(3));
  }

  private shiftKind(shift: string) {
    return /night/i.test(String(shift || '')) ? 'night' : 'day';
  }

  private dayBounds(date: Date | string) {
    const raw = date instanceof Date ? date.toISOString() : String(date || '');
    const key = /^\d{4}-\d{2}-\d{2}/.test(raw)
      ? raw.slice(0, 10)
      : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return {
      start: new Date(`${key}T00:00:00.000+05:30`),
      end: new Date(`${key}T23:59:59.999+05:30`),
    };
  }

  /** Bags already saved for this mill and shift (production + intermill). */
  async shiftBags(plantId: string, shift: string, date: Date | string) {
    const { start, end } = this.dayBounds(date);
    const kind = this.shiftKind(shift);
    const [production, intermill] = await Promise.all([
      this.prisma.productionBatch.findMany({
        where: { plantId, date: { gte: start, lte: end } },
        select: { shift: true, safaiDustBags: true, patalBags: true },
      }),
      this.prisma.intermillBatch.findMany({
        where: {
          plantId,
          date: { gte: start, lte: end },
          status: { in: ['COMPLETED', 'PENDING_APPROVAL'] },
        },
        select: { shift: true, safaiDustBags: true, patalBags: true },
      }),
    ]);
    const rows = [...production, ...intermill].filter(
      (r) => this.shiftKind(r.shift) === kind,
    );
    const safaiDustBags = rows.reduce((s, r) => s + Number(r.safaiDustBags || 0), 0);
    const patalBags = rows.reduce((s, r) => s + Number(r.patalBags || 0), 0);
    return { safaiDustBags, patalBags, total: safaiDustBags + patalBags };
  }

  /** Put produced bags into by-product stock. Weight is recorded from the mill average. */
  async addToStock(opts: {
    plantId: string;
    shift: string;
    safaiDustBags: number;
    patalBags: number;
    referenceId: string;
    bagWeightQtl: number;
  }) {
    const lines = [
      { name: 'Safai Dust', bags: opts.safaiDustBags },
      { name: 'Patal', bags: opts.patalBags },
    ];
    for (const line of lines) {
      if (!line.bags) continue;
      const qtl = this.weightQtl(line.bags, opts.bagWeightQtl);
      await this.inventory.adjustStock({
        plantId: opts.plantId,
        itemType: 'BYPRODUCT',
        variety: line.name,
        quantityChange: line.bags,
        transactionType: 'IN',
        referenceId: opts.referenceId,
        remarks: `${line.name}: ${line.bags} bags × ${opts.bagWeightQtl} qtl = ${qtl} qtl`,
        shift: opts.shift,
        unit: 'Bags',
      });
    }
  }

  /** More than 10 Safai Dust + Patal bags in one shift notifies admin. */
  async notifyIfOverShiftLimit(opts: {
    plantId: string;
    shift: string;
    date: Date | string;
    bagWeightQtl: number;
  }) {
    const totals = await this.shiftBags(opts.plantId, opts.shift, opts.date);
    if (totals.total <= 10) return totals;
    const plant = await this.prisma.plant.findUnique({
      where: { id: opts.plantId },
      select: { name: true },
    });
    const safaiQtl = this.weightQtl(totals.safaiDustBags, opts.bagWeightQtl);
    const patalQtl = this.weightQtl(totals.patalBags, opts.bagWeightQtl);
    const message =
      `Safai Dust + Patal is ${totals.total} bags in the ${opts.shift} shift at ${plant?.name || opts.plantId} (more than 10). ` +
      `Safai Dust ${totals.safaiDustBags} bags (${safaiQtl} qtl), Patal ${totals.patalBags} bags (${patalQtl} qtl) ` +
      `at ${opts.bagWeightQtl} qtl per bag.`;
    try {
      await this.prisma.notification.createMany({
        data: ['SUPER_ADMIN', 'PLANT_MANAGER', 'ADMIN'].map((role) => ({
          title: 'Safai Dust / Patal over 10 bags',
          message,
          type: 'WARNING',
          role,
        })),
      });
    } catch {
      /* notify best-effort */
    }
    return totals;
  }
}

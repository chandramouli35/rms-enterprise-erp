import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceLedgerService } from './finance-ledger.service';

/** Feedback 29 bag tare constants (quintals per bag) */
export const BAG_WEIGHT_PLASTIC_QTL = 0.002;
export const BAG_WEIGHT_JUTE_QTL = 0.01;

@Injectable()
export class FinanceSalePurchaseService {
  private readonly logger = new Logger(FinanceSalePurchaseService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => FinanceLedgerService))
    private ledger: FinanceLedgerService,
  ) {}

  /** Section P: Oil Result After Cut */
  static oilResultAfterCut(oilResult: number | null | undefined): number | null {
    if (oilResult == null || Number.isNaN(Number(oilResult)) || Number(oilResult) <= 0) {
      return null;
    }
    const A = Number(oilResult) - 1;
    return A > 15 ? (A - 15) / 2 + 15 : A;
  }

  static isRiceBran(itemName?: string | null): boolean {
    return /bran/i.test(String(itemName || ''));
  }

  static bagConstant(bagType?: string | null): number {
    const t = String(bagType || '').toUpperCase();
    if (t === 'PLASTIC') return BAG_WEIGHT_PLASTIC_QTL;
    if (t === 'JUTE') return BAG_WEIGHT_JUTE_QTL;
    return 0;
  }

  static round3(n: number): number {
    return Math.round(n * 1000) / 1000;
  }

  /**
   * Create Sale/Purchase report line when a non-draft GP with finance soda is submitted.
   * Section H serial assigned under row lock (cross-mill chronological).
   */
  async syncFromGatePass(gatePassId: string) {
    const gp = await this.prisma.gatePass.findUnique({
      where: { id: gatePassId },
      include: {
        financeSoda: { include: { item: true } },
        financeSalePurchaseLine: true,
      },
    });
    if (!gp) return null;
    if (gp.isDraft) return null; // F29: drafts must not push to reports
    if (gp.status === 'CANCELLED') return null;
    if (!gp.financeSodaId || !gp.financeSoda) return null;

    // Existing line: still refresh Section K + Party Ledger (create/update sync)
    if (gp.financeSalePurchaseLine) {
      await this.resyncSodaPaymentAmount(gp.financeSodaId);
      await this.pushLineToLedger(gp.financeSalePurchaseLine.id);
      return gp.financeSalePurchaseLine;
    }

    const soda = gp.financeSoda;
    const reportType = soda.sodaType; // SALE | PURCHASE

    const line = await this.prisma.$transaction(async (tx) => {
      // Lock soda row for serial assignment
      await tx.financeSoda.update({
        where: { id: soda.id },
        data: { updatedAt: new Date() },
      });

      const existing = await tx.financeSalePurchaseLine.findUnique({
        where: { gatePassId },
      });
      if (existing) return existing;

      const last = await tx.financeSalePurchaseLine.findFirst({
        where: { financeSodaId: soda.id },
        orderBy: { serialNo: 'desc' },
        select: { serialNo: true },
      });
      const serialNo = (last?.serialNo || 0) + 1;

      return tx.financeSalePurchaseLine.create({
        data: {
          reportType,
          plantId: gp.plantId,
          financeSodaId: soda.id,
          gatePassId: gp.id,
          serialNo,
          bagWeightConsideration: false,
          cdPercent: 0,
        },
      });
    });

    await this.resyncSodaPaymentAmount(soda.id);
    await this.pushLineToLedger(line.id);
    return line;
  }

  /** Push Sale/Purchase report line → Party Ledger (Section Y net payment). */
  private async pushLineToLedger(lineId: string) {
    try {
      await this.ledger.syncReportLine(lineId);
    } catch (err: any) {
      this.logger.error(
        `Ledger sync failed for sale-purchase line ${lineId}: ${err?.message || err}`,
      );
    }
  }

  async removeForGatePass(gatePassId: string) {
    const existing = await this.prisma.financeSalePurchaseLine.findUnique({
      where: { gatePassId },
    });
    if (!existing) return null;
    try {
      await this.ledger.removeReportLine(existing.id);
    } catch {
      /* ignore */
    }
    await this.prisma.financeSalePurchaseLine.delete({ where: { gatePassId } });
    await this.resyncSodaPaymentAmount(existing.financeSodaId);
    return existing;
  }

  /** Section K on soda = sum of Section Y net payments for that soda */
  async resyncSodaPaymentAmount(financeSodaId: string) {
    const lines = await this.prisma.financeSalePurchaseLine.findMany({
      where: { financeSodaId },
      include: {
        gatePass: true,
        financeSoda: { include: { item: true } },
      },
    });
    let total = 0;
    for (const line of lines) {
      const shaped = this.shapeLine(line);
      total += shaped.netPayment || 0;
    }
    total = FinanceSalePurchaseService.round3(total);
    await this.prisma.financeSoda.update({
      where: { id: financeSodaId },
      data: { paymentAmount: total },
    });
    return total;
  }

  async listReport(reportType: 'SALE' | 'PURCHASE', plantId?: string) {
    const where: any = { reportType };
    if (plantId) where.plantId = plantId;

    const plants = await this.prisma.plant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const lines = await this.prisma.financeSalePurchaseLine.findMany({
      where,
      include: {
        plant: { select: { id: true, name: true } },
        gatePass: true,
        financeSoda: {
          include: {
            item: { select: { id: true, name: true } },
            party: { select: { id: true, name: true } },
            partyPlant: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { serialNo: 'desc' }],
    });

    return {
      plants,
      rows: lines.map((l) => this.shapeLine(l)),
    };
  }

  shapeLine(line: any) {
    const soda = line.financeSoda;
    const gp = line.gatePass;
    const itemName = soda?.item?.name || '';
    const partyName = soda?.party?.name || soda?.partyPlant?.name || '';
    const rateD = soda?.isShift ? null : soda?.rate != null ? Number(soda.rate) : null;
    const bags =
      ((gp?.mainBags || 0) + (gp?.shortageBags || 0)) || gp?.noOfBags || 0;
    const bagType = gp?.bagTypeGp || null;
    const millRaw = gp?.netWeight != null ? Number(gp.netWeight) : 0;
    const partyRaw = gp?.ntWtParty != null ? Number(gp.ntWtParty) : 0;

    const consider = !!line.bagWeightConsideration;
    const bagConst = FinanceSalePurchaseService.bagConstant(bagType);
    const totalBagWt = FinanceSalePurchaseService.round3(bags * bagConst);
    const bagTypeOk = ['PLASTIC', 'JUTE'].includes(String(bagType || '').toUpperCase());

    let millNet = millRaw;
    let partyNet = partyRaw;
    let bagWeightError: string | null = null;
    if (consider) {
      if (!bagTypeOk) {
        bagWeightError = 'Bag Type must be Plastic or Jute when Bag Weight Consideration = Yes';
      } else if (totalBagWt > 0) {
        if (millRaw > 0 && totalBagWt > millRaw) {
          bagWeightError = `Bag tare ${totalBagWt.toFixed(3)} exceeds mill net ${millRaw.toFixed(3)}`;
        } else if (partyRaw > 0 && totalBagWt > partyRaw) {
          bagWeightError = `Bag tare ${totalBagWt.toFixed(3)} exceeds party net ${partyRaw.toFixed(3)}`;
        } else {
          millNet = FinanceSalePurchaseService.round3(Math.max(0, millRaw - totalBagWt));
          partyNet = FinanceSalePurchaseService.round3(Math.max(0, partyRaw - totalBagWt));
        }
      }
    }

    const oilResult =
      line.oilResult != null && !Number.isNaN(Number(line.oilResult))
        ? Number(line.oilResult)
        : null;
    const oilAfterCut = FinanceSalePurchaseService.oilResultAfterCut(oilResult);
    const isBran = FinanceSalePurchaseService.isRiceBran(itemName);
    const oilRequired = isBran && (oilAfterCut == null || oilResult == null || !(oilResult > 0));

    const lowerWeight = FinanceSalePurchaseService.round3(Math.min(millNet, partyNet));
    const weightDiff = FinanceSalePurchaseService.round3(millNet - partyNet);
    const weightPerBag =
      bags > 0 ? FinanceSalePurchaseService.round3(millNet / bags) : 0;

    // Section V: standard = D; Rice Bran = P * D (oil required — never fall back to plain D)
    let rateV: number | null = null;
    if (soda?.isShift) {
      rateV = null;
    } else if (isBran) {
      rateV =
        !oilRequired && oilAfterCut != null && rateD != null
          ? FinanceSalePurchaseService.round3(oilAfterCut * rateD)
          : null;
    } else {
      rateV = rateD;
    }

    const billAmount =
      rateV != null
        ? FinanceSalePurchaseService.round3(rateV * lowerWeight)
        : 0;
    const cdPercent = Number(line.cdPercent) || 0;
    const cdAmount = FinanceSalePurchaseService.round3(billAmount * (cdPercent / 100));
    const netPayment = FinanceSalePurchaseService.round3(billAmount - cdAmount);

    return {
      id: line.id,
      reportType: line.reportType,
      plantId: line.plantId,
      plantName: line.plant?.name || '',
      financeSodaId: line.financeSodaId,
      gatePassId: line.gatePassId,
      // A–F soda
      sodaDate: soda?.date,
      itemName,
      partyName,
      rate: rateD,
      isShift: !!soda?.isShift,
      quantity: soda?.quantity,
      sodaNumber: soda?.sodaNumber,
      // G
      billNo: gp?.billNoNA ? 'N/A' : gp?.billNo || '',
      // H
      serialNo: line.serialNo,
      // I–M GP
      gpDate: gp?.gpStartDate || gp?.createdAt,
      truckNo: gp?.vehicleNo || '',
      gpNo: gp?.qrCode || '',
      bags,
      bagType,
      // N–AA
      bagWeightConsideration: consider,
      bagTareTotal: totalBagWt,
      bagWeightError,
      oilResult,
      oilResultAfterCut: oilAfterCut,
      isRiceBran: isBran,
      oilRequired,
      netWeightMill: millNet,
      netWeightParty: partyNet,
      netWeightMillRaw: millRaw,
      netWeightPartyRaw: partyRaw,
      lowerWeight,
      weightDifference: weightDiff,
      weightDiscrepancy: Math.abs(weightDiff) > 0.001,
      weightPerBag,
      rateV,
      billAmount,
      cdPercent,
      netPayment,
      paymentStatus: soda?.paymentStatus || 'NOT_CLEAR',
      note: line.note || '',
      createdAt: line.createdAt,
    };
  }

  async updateLine(
    id: string,
    data: {
      bagWeightConsideration?: boolean;
      oilResult?: number | null;
      cdPercent?: number;
      note?: string;
    },
    user?: any,
  ) {
    const line = await this.prisma.financeSalePurchaseLine.findUnique({
      where: { id },
      include: {
        gatePass: true,
        financeSoda: { include: { item: true } },
        plant: true,
      },
    });
    if (!line) throw new NotFoundException('Report row not found');

    const roleName = user?.role?.name || user?.role;
    if (roleName !== 'SUPER_ADMIN' && roleName !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can edit Sale/Purchase report fields');
    }

    const nextConsider =
      data.bagWeightConsideration !== undefined
        ? !!data.bagWeightConsideration
        : line.bagWeightConsideration;

    if (nextConsider) {
      const bagType = String(line.gatePass.bagTypeGp || '').toUpperCase();
      if (!['PLASTIC', 'JUTE'].includes(bagType)) {
        throw new BadRequestException(
          'Bag Weight Consideration requires Gate Pass Bag Type Plastic or Jute',
        );
      }
      const bags =
        ((line.gatePass.mainBags || 0) + (line.gatePass.shortageBags || 0)) ||
        line.gatePass.noOfBags ||
        0;
      const bagConst = FinanceSalePurchaseService.bagConstant(bagType);
      const totalBagWt = bags * bagConst;
      const millRaw = Number(line.gatePass.netWeight) || 0;
      const partyRaw = Number(line.gatePass.ntWtParty) || 0;
      if (millRaw > 0 && totalBagWt > millRaw) {
        throw new BadRequestException(
          `Total bag weight (${totalBagWt.toFixed(3)} Qtl) exceeds mill net weight (${millRaw.toFixed(3)} Qtl)`,
        );
      }
      if (partyRaw > 0 && totalBagWt > partyRaw) {
        throw new BadRequestException(
          `Total bag weight (${totalBagWt.toFixed(3)} Qtl) exceeds party net weight (${partyRaw.toFixed(3)} Qtl)`,
        );
      }
    }

    if (data.oilResult !== undefined && data.oilResult != null) {
      const o = Number(data.oilResult);
      if (!(o > 0) || Number.isNaN(o)) {
        throw new BadRequestException('Oil Result must be a positive number');
      }
    }

    // Rice Bran: Section O required — cannot clear/omit oil once editing oil field
    const itemName = line.financeSoda?.item?.name || '';
    if (FinanceSalePurchaseService.isRiceBran(itemName) && data.oilResult !== undefined) {
      if (data.oilResult == null || !(Number(data.oilResult) > 0)) {
        throw new BadRequestException(
          'Oil Result (Section O) is required for Rice Bran to calculate Sections P, V, W, Y',
        );
      }
    }

    if (data.cdPercent !== undefined) {
      const c = Number(data.cdPercent);
      if (Number.isNaN(c) || c < 0) {
        throw new BadRequestException('CD% must be >= 0');
      }
    }

    await this.prisma.financeSalePurchaseLine.update({
      where: { id },
      data: {
        ...(data.bagWeightConsideration !== undefined
          ? { bagWeightConsideration: !!data.bagWeightConsideration }
          : {}),
        ...(data.oilResult !== undefined
          ? { oilResult: data.oilResult == null ? null : Number(data.oilResult) }
          : {}),
        ...(data.cdPercent !== undefined ? { cdPercent: Number(data.cdPercent) } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });

    await this.resyncSodaPaymentAmount(line.financeSodaId);
    await this.pushLineToLedger(id);

    const refreshed = await this.prisma.financeSalePurchaseLine.findUnique({
      where: { id },
      include: {
        plant: { select: { id: true, name: true } },
        gatePass: true,
        financeSoda: {
          include: {
            item: { select: { id: true, name: true } },
            party: { select: { id: true, name: true } },
            partyPlant: { select: { id: true, name: true } },
          },
        },
      },
    });
    return this.shapeLine(refreshed);
  }

  /** Payment status from report → soda (Section Z ↔ F28 L) + audit */
  async updatePaymentStatusFromReport(
    lineId: string,
    paymentStatus: string,
    user?: any,
    plantIdFilter?: string,
  ) {
    const line = await this.prisma.financeSalePurchaseLine.findUnique({
      where: { id: lineId },
      include: { financeSoda: true },
    });
    if (!line) throw new NotFoundException('Report row not found');

    const allowed = ['CLEAR', 'UNDERWAY', 'NOT_CLEAR'];
    if (!allowed.includes(paymentStatus)) {
      throw new BadRequestException('Payment Status must be Clear, Underway, or Not Clear');
    }
    const roleName = user?.role?.name || user?.role;
    if (roleName !== 'SUPER_ADMIN' && roleName !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can update Payment Status');
    }

    const from = line.financeSoda.paymentStatus;
    await this.prisma.financeSoda.updateMany({
      where: { sodaType: line.financeSoda.sodaType, sodaNumber: line.financeSoda.sodaNumber },
      data: { paymentStatus },
    });
    await this.prisma.financePaymentStatusAudit.create({
      data: {
        financeSodaId: line.financeSodaId,
        fromStatus: from,
        toStatus: paymentStatus,
        changedById: user?.id || null,
      },
    });

    // Preserve caller's mill filter (undefined/empty = All mills)
    return this.listReport(
      line.reportType as 'SALE' | 'PURCHASE',
      plantIdFilter || undefined,
    );
  }

  async listPaymentAudits(financeSodaId?: string, limit = 50) {
    return this.prisma.financePaymentStatusAudit.findMany({
      where: financeSodaId ? { financeSodaId } : undefined,
      include: {
        financeSoda: {
          select: { sodaType: true, sodaNumber: true, id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  /** Backfill report lines for historical non-draft GPs already linked to sodas */
  async backfillMissingLines() {
    const gps = await this.prisma.gatePass.findMany({
      where: {
        financeSodaId: { not: null },
        isDraft: false,
        status: { not: 'CANCELLED' },
        financeSalePurchaseLine: null,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    let created = 0;
    for (const gp of gps) {
      const line = await this.syncFromGatePass(gp.id);
      if (line) created += 1;
    }
    const ledger = await this.ledger.backfillFromReportLines();
    return { scanned: gps.length, created, ledger };
  }

  // ─── Feedback 30 — Junction Report ───────────────────────────────────────
  private partyKeyOf(soda: { partyId?: string | null; partyPlantId?: string | null }) {
    if (soda.partyId) return `party:${soda.partyId}`;
    if (soda.partyPlantId) return `plant:${soda.partyPlantId}`;
    return '';
  }

  private partyNameOf(soda: any) {
    return soda.party?.name || soda.partyPlant?.name || '—';
  }

  /**
   * Cross-mill Sale/Purchase junction: filter by party ↔ soda (linked),
   * stitch all mill lines A–AA, soda-wise Total Receivables / Payables.
   * PDF Table 01: sections ordered by soda no + serial; summary after each soda.
   */
  async junctionReport(
    reportType: 'SALE' | 'PURCHASE',
    filters?: { partyKey?: string; financeSodaId?: string },
  ) {
    const type = reportType === 'PURCHASE' ? 'PURCHASE' : 'SALE';
    const partyKey = filters?.partyKey || '';
    const financeSodaId = filters?.financeSodaId || '';
    const summaryLabel = type === 'SALE' ? 'Total Receivables' : 'Total Payables';

    const sodas = await this.prisma.financeSoda.findMany({
      where: { sodaType: type },
      include: {
        item: { select: { id: true, name: true } },
        party: { select: { id: true, name: true } },
        partyPlant: { select: { id: true, name: true } },
        salePurchaseLines: {
          include: {
            plant: { select: { id: true, name: true } },
            gatePass: true,
            financeSoda: {
              include: {
                item: { select: { id: true, name: true } },
                party: { select: { id: true, name: true } },
                partyPlant: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ serialNo: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { sodaNumber: 'asc' },
    });

    // Full party list always (filter UI must stay switchable)
    const partyMap = new Map<string, { key: string; name: string; sodaCount: number }>();
    for (const s of sodas) {
      const key = this.partyKeyOf(s);
      if (!key) continue;
      const name = this.partyNameOf(s);
      const prev = partyMap.get(key);
      if (prev) prev.sodaCount += 1;
      else partyMap.set(key, { key, name, sodaCount: 1 });
    }
    const parties = [...partyMap.values()].sort((a, b) => a.name.localeCompare(b.name));

    const mapSodaOpt = (s: (typeof sodas)[0]) => ({
      id: s.id,
      sodaNumber: s.sodaNumber,
      label: `${type === 'SALE' ? 'SO' : 'PO'}-${String(s.sodaNumber).padStart(2, '0')} · ${s.item?.name || ''} · ${this.partyNameOf(s)}`,
      partyKey: this.partyKeyOf(s),
      partyName: this.partyNameOf(s),
      paymentStatus: s.paymentStatus,
      itemName: s.item?.name || '',
      lineCount: s.salePurchaseLines.length,
    });

    // Linked filters: Party narrows soda list; Soda implies its party’s sodas in the panel
    let sodaOptions = sodas.map(mapSodaOpt);
    let linkPartyKey = partyKey;
    if (financeSodaId) {
      const hit = sodas.find((s) => s.id === financeSodaId);
      if (hit) {
        const pk = this.partyKeyOf(hit);
        if (!linkPartyKey) linkPartyKey = pk;
      }
    }
    if (linkPartyKey) {
      sodaOptions = sodaOptions.filter((o) => o.partyKey === linkPartyKey);
    }

    const hasFilter = !!(partyKey || financeSodaId);
    let targetSodas = sodas;
    if (partyKey) targetSodas = targetSodas.filter((s) => this.partyKeyOf(s) === partyKey);
    if (financeSodaId) targetSodas = targetSodas.filter((s) => s.id === financeSodaId);
    targetSodas = [...targetSodas].sort((a, b) => a.sodaNumber - b.sodaNumber);

    const sections: {
      financeSodaId: string;
      sodaNumber: number;
      partyName: string;
      itemName: string;
      paymentStatus: string;
      totalNetPayment: number;
      label: string;
      rows: any[];
    }[] = [];
    const rows: any[] = [];
    const summaries: {
      financeSodaId: string;
      sodaNumber: number;
      partyName: string;
      itemName: string;
      paymentStatus: string;
      totalNetPayment: number;
      label: string;
    }[] = [];

    if (hasFilter) {
      for (const s of targetSodas) {
        const sectionRows: any[] = [];
        let sodaTotal = 0;
        const lines = [...s.salePurchaseLines].sort((a, b) => {
          if ((a.serialNo || 0) !== (b.serialNo || 0)) return (a.serialNo || 0) - (b.serialNo || 0);
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        for (const line of lines) {
          const shaped = this.shapeLine({
            ...line,
            financeSoda: line.financeSoda || s,
            plant: line.plant,
          });
          sectionRows.push(shaped);
          rows.push(shaped);
          sodaTotal += shaped.netPayment || 0;
        }
        const totalNetPayment = FinanceSalePurchaseService.round3(sodaTotal);
        const meta = {
          financeSodaId: s.id,
          sodaNumber: s.sodaNumber,
          partyName: this.partyNameOf(s),
          itemName: s.item?.name || '',
          paymentStatus: s.paymentStatus,
          totalNetPayment,
          label: summaryLabel,
        };
        summaries.push(meta);
        sections.push({ ...meta, rows: sectionRows });
      }
    }

    const grandTotal = FinanceSalePurchaseService.round3(
      summaries.reduce((sum, s) => sum + (s.totalNetPayment || 0), 0),
    );

    return {
      reportType: type,
      summaryLabel,
      parties,
      sodas: sodaOptions,
      rows,
      sections,
      summaries,
      grandTotal,
      hasFilter,
    };
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceSalePurchaseService } from './finance-sale-purchase.service';

export type LedgerPartyKey = string; // party:<uuid> | plant:<uuid>

@Injectable()
export class FinanceLedgerService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => FinanceSalePurchaseService))
    private salePurchase: FinanceSalePurchaseService,
  ) {}

  static round3(n: number) {
    return Math.round(n * 1000) / 1000;
  }

  parsePartyKey(partyKey: string): { partyId?: string; partyPlantId?: string } {
    if (!partyKey) throw new BadRequestException('Party is required');
    if (partyKey.startsWith('party:')) return { partyId: partyKey.slice(6) };
    if (partyKey.startsWith('plant:')) return { partyPlantId: partyKey.slice(6) };
    throw new BadRequestException('Invalid party key');
  }

  partyKeyOf(row: { partyId?: string | null; partyPlantId?: string | null }) {
    if (row.partyId) return `party:${row.partyId}`;
    if (row.partyPlantId) return `plant:${row.partyPlantId}`;
    return '';
  }

  partyNameOf(row: any) {
    return row.party?.name || row.partyPlant?.name || '—';
  }

  /**
   * Upsert ledger row from a Sale/Purchase report line (Section Y → Debit/Credit).
   * SALE → Debit (party owes us). PURCHASE → Credit (we owe party).
   */
  async syncReportLine(lineId: string) {
    const line = await this.prisma.financeSalePurchaseLine.findUnique({
      where: { id: lineId },
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
    if (!line?.financeSoda) return null;

    const shaped = this.salePurchase.shapeLine(line);
    const soda = line.financeSoda;
    const amount = FinanceLedgerService.round3(shaped.netPayment || 0);
    const isSale = line.reportType === 'SALE';
    const sodaLabel = `${isSale ? 'SO' : 'PO'}-${String(soda.sodaNumber).padStart(2, '0')}`;
    const narration = `Soda No. ${sodaLabel}${shaped.gpNo ? ` · GP ${shaped.gpNo}` : ''}`;

    const data = {
      date: shaped.gpDate ? new Date(shaped.gpDate) : soda.date || new Date(),
      entryType: isSale ? 'SALE' : 'PURCHASE',
      partyId: soda.partyId || null,
      partyPlantId: soda.partyPlantId || null,
      financeSodaId: soda.id,
      salePurchaseLineId: line.id,
      plantId: line.plantId,
      narration,
      notes: null as string | null,
      debit: isSale ? amount : 0,
      credit: isSale ? 0 : amount,
    };

    return this.prisma.financeLedgerEntry.upsert({
      where: { salePurchaseLineId: line.id },
      create: data,
      update: {
        date: data.date,
        entryType: data.entryType,
        partyId: data.partyId,
        partyPlantId: data.partyPlantId,
        financeSodaId: data.financeSodaId,
        plantId: data.plantId,
        narration: data.narration,
        debit: data.debit,
        credit: data.credit,
      },
    });
  }

  async removeReportLine(salePurchaseLineId: string) {
    await this.prisma.financeLedgerEntry.deleteMany({
      where: { salePurchaseLineId },
    });
  }

  async backfillFromReportLines() {
    const lines = await this.prisma.financeSalePurchaseLine.findMany({
      select: { id: true },
    });
    let synced = 0;
    for (const line of lines) {
      const row = await this.syncReportLine(line.id);
      if (row) synced += 1;
    }
    return { scanned: lines.length, synced };
  }

  async listPartyOptions() {
    const [parties, plantParties] = await Promise.all([
      this.prisma.financeParty.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.plant.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);
    return [
      ...parties.map((p) => ({ key: `party:${p.id}`, name: p.name, kind: 'PARTY' as const })),
      ...plantParties.map((p) => ({ key: `plant:${p.id}`, name: p.name, kind: 'PLANT' as const })),
    ];
  }

  async createPayment(
    data: {
      entryType: 'RECEIPT' | 'PAYMENT';
      partyKey: string;
      date: string;
      narration?: string;
      amount: number;
      notes?: string;
      financeSodaId?: string;
    },
    userId?: string,
  ) {
    const entryType = data.entryType === 'PAYMENT' ? 'PAYMENT' : 'RECEIPT';
    const amount = Number(data.amount);
    if (!(amount > 0) || Number.isNaN(amount)) {
      throw new BadRequestException('Amount must be a positive number');
    }
    const { partyId, partyPlantId } = this.parsePartyKey(data.partyKey);
    if (partyId) {
      const p = await this.prisma.financeParty.findUnique({ where: { id: partyId } });
      if (!p) throw new NotFoundException('Party not found');
    }
    if (partyPlantId) {
      const p = await this.prisma.plant.findUnique({ where: { id: partyPlantId } });
      if (!p) throw new NotFoundException('Mill party not found');
    }

    let financeSodaId: string | null = data.financeSodaId || null;
    if (financeSodaId) {
      const soda = await this.prisma.financeSoda.findUnique({ where: { id: financeSodaId } });
      if (!soda) throw new NotFoundException('Soda not found');
      if (partyId && soda.partyId && soda.partyId !== partyId) {
        throw new BadRequestException('Soda does not belong to this party');
      }
      if (partyPlantId && soda.partyPlantId && soda.partyPlantId !== partyPlantId) {
        throw new BadRequestException('Soda does not belong to this mill party');
      }
    }

    const date = data.date ? new Date(data.date) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    const rounded = FinanceLedgerService.round3(amount);
    const defaultNarration =
      entryType === 'RECEIPT' ? 'Payment Received' : 'Payment Paid';

    return this.prisma.financeLedgerEntry.create({
      data: {
        date,
        entryType,
        partyId: partyId || null,
        partyPlantId: partyPlantId || null,
        financeSodaId,
        narration: (data.narration || '').trim() || defaultNarration,
        notes: data.notes?.trim() || null,
        debit: entryType === 'PAYMENT' ? rounded : 0,
        credit: entryType === 'RECEIPT' ? rounded : 0,
        createdById: userId || null,
      },
      include: {
        party: { select: { id: true, name: true } },
        partyPlant: { select: { id: true, name: true } },
        financeSoda: { select: { id: true, sodaNumber: true, sodaType: true } },
      },
    });
  }

  async listPayments(entryType: 'RECEIPT' | 'PAYMENT', limit = 50) {
    const rows = await this.prisma.financeLedgerEntry.findMany({
      where: { entryType },
      include: {
        party: { select: { id: true, name: true } },
        partyPlant: { select: { id: true, name: true } },
        financeSoda: { select: { id: true, sodaNumber: true, sodaType: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(limit, 200),
    });
    return rows.map((r) => this.shapePayment(r));
  }

  private shapePayment(r: any) {
    return {
      id: r.id,
      date: r.date,
      entryType: r.entryType,
      partyKey: this.partyKeyOf(r),
      partyName: this.partyNameOf(r),
      narration: r.narration,
      notes: r.notes,
      amount: r.entryType === 'RECEIPT' ? r.credit : r.debit,
      financeSodaId: r.financeSodaId,
      sodaNumber: r.financeSoda?.sodaNumber ?? null,
      sodaType: r.financeSoda?.sodaType ?? null,
      createdAt: r.createdAt,
    };
  }

  /** Receivables (Sale) or Payables (Purchase) party rollups */
  async outstanding(kind: 'RECEIVABLES' | 'PAYABLES', opts?: { owingOnly?: boolean }) {
    const isRecv = kind === 'RECEIVABLES';
    const billType = isRecv ? 'SALE' : 'PURCHASE';
    const payType = isRecv ? 'RECEIPT' : 'PAYMENT';
    const owingOnly = opts?.owingOnly !== false;

    const entries = await this.prisma.financeLedgerEntry.findMany({
      where: { entryType: { in: [billType, payType] } },
      include: {
        party: { select: { id: true, name: true } },
        partyPlant: { select: { id: true, name: true } },
        financeSoda: { select: { id: true, sodaNumber: true, sodaType: true, item: { select: { name: true } } } },
        plant: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    type Acc = {
      partyKey: string;
      partyName: string;
      totalBilled: number;
      totalSettled: number;
      sodas: Map<
        string,
        {
          financeSodaId: string;
          sodaNumber: number;
          itemName: string;
          billed: number;
          settled: number;
        }
      >;
    };
    const map = new Map<string, Acc>();

    for (const e of entries) {
      const key = this.partyKeyOf(e);
      if (!key) continue;
      let acc = map.get(key);
      if (!acc) {
        acc = {
          partyKey: key,
          partyName: this.partyNameOf(e),
          totalBilled: 0,
          totalSettled: 0,
          sodas: new Map(),
        };
        map.set(key, acc);
      }

      if (e.entryType === billType) {
        const amt = isRecv ? e.debit : e.credit;
        acc.totalBilled += amt;
        if (e.financeSodaId) {
          const sid = e.financeSodaId;
          let s = acc.sodas.get(sid);
          if (!s) {
            s = {
              financeSodaId: sid,
              sodaNumber: e.financeSoda?.sodaNumber || 0,
              itemName: e.financeSoda?.item?.name || '',
              billed: 0,
              settled: 0,
            };
            acc.sodas.set(sid, s);
          }
          s.billed += amt;
        }
      } else if (e.entryType === payType) {
        const amt = isRecv ? e.credit : e.debit;
        acc.totalSettled += amt;
        if (e.financeSodaId) {
          const sid = e.financeSodaId;
          let s = acc.sodas.get(sid);
          if (!s) {
            s = {
              financeSodaId: sid,
              sodaNumber: e.financeSoda?.sodaNumber || 0,
              itemName: e.financeSoda?.item?.name || '',
              billed: 0,
              settled: 0,
            };
            acc.sodas.set(sid, s);
          }
          s.settled += amt;
        }
      }
    }

    const parties = [...map.values()]
      .map((p) => {
        const outstanding = FinanceLedgerService.round3(p.totalBilled - p.totalSettled);
        const sodas = [...p.sodas.values()]
          .map((s) => ({
            ...s,
            billed: FinanceLedgerService.round3(s.billed),
            settled: FinanceLedgerService.round3(s.settled),
            outstanding: FinanceLedgerService.round3(s.billed - s.settled),
          }))
          .sort((a, b) => a.sodaNumber - b.sodaNumber);
        return {
          partyKey: p.partyKey,
          partyName: p.partyName,
          totalBilled: FinanceLedgerService.round3(p.totalBilled),
          totalSettled: FinanceLedgerService.round3(p.totalSettled),
          outstanding,
          sodas,
        };
      })
      .filter((p) => p.totalBilled > 0 || p.totalSettled > 0)
      .filter((p) => !owingOnly || p.outstanding > 0.0005)
      .sort((a, b) => Math.abs(b.outstanding) - Math.abs(a.outstanding));

    const totals = {
      totalBilled: FinanceLedgerService.round3(parties.reduce((s, p) => s + p.totalBilled, 0)),
      totalSettled: FinanceLedgerService.round3(parties.reduce((s, p) => s + p.totalSettled, 0)),
      outstanding: FinanceLedgerService.round3(parties.reduce((s, p) => s + p.outstanding, 0)),
    };

    return {
      kind,
      labels: isRecv
        ? {
            billed: 'Total Billed Amount',
            settled: 'Total Received',
            outstanding: 'Net Outstanding (Receivable)',
          }
        : {
            billed: 'Total Purchased Amount',
            settled: 'Total Paid',
            outstanding: 'Net Outstanding (Payable)',
          },
      parties,
      totals,
    };
  }

  async partyStatement(
    partyKey: string,
    filters?: { from?: string; to?: string; q?: string },
  ) {
    if (!partyKey?.trim()) {
      throw new BadRequestException('partyKey is required');
    }
    const { partyId, partyPlantId } = this.parsePartyKey(partyKey);
    const where: any = {};
    if (partyId) where.partyId = partyId;
    if (partyPlantId) where.partyPlantId = partyPlantId;

    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const rows = await this.prisma.financeLedgerEntry.findMany({
      where,
      include: {
        party: { select: { id: true, name: true } },
        partyPlant: { select: { id: true, name: true } },
        financeSoda: { select: { id: true, sodaNumber: true, sodaType: true } },
        plant: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    const q = (filters?.q || '').trim().toLowerCase();
    let balance = 0;
    const lines: any[] = [];
    for (const r of rows) {
      balance = FinanceLedgerService.round3(balance + (r.debit || 0) - (r.credit || 0));
      const sodaNo = r.financeSoda
        ? `${r.financeSoda.sodaType === 'SALE' ? 'SO' : 'PO'}-${String(r.financeSoda.sodaNumber).padStart(2, '0')}`
        : '';
      const typeLabel =
        ({ SALE: 'Sale', PURCHASE: 'Purchase', RECEIPT: 'Payment Received', PAYMENT: 'Payment Paid' } as any)[
          r.entryType
        ] || r.entryType;
      const line = {
        id: r.id,
        date: r.date,
        sodaDealNo: sodaNo,
        millName: r.plant?.name || '—',
        transactionType: typeLabel,
        entryType: r.entryType,
        narration: r.narration || '',
        notes: r.notes || '',
        debit: r.debit || 0,
        credit: r.credit || 0,
        runningBalance: balance,
      };
      if (q) {
        const hay = `${line.sodaDealNo} ${line.millName} ${line.transactionType} ${line.narration} ${line.notes}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      lines.push(line);
    }

    // If search filtered mid-stream, recompute running balance on visible lines only from full set is wrong.
    // Prefer: filter after computing on full set but keep original running balances from full chronology.
    // Above skips push but balance still advances — good for statement integrity when searching.

    const partyName =
      rows[0] ? this.partyNameOf(rows[0]) : await this.resolvePartyName(partyKey);

    return {
      partyKey,
      partyName,
      lines,
      closingBalance: FinanceLedgerService.round3(balance),
    };
  }

  private async resolvePartyName(partyKey: string) {
    const { partyId, partyPlantId } = this.parsePartyKey(partyKey);
    if (partyId) {
      const p = await this.prisma.financeParty.findUnique({ where: { id: partyId } });
      return p?.name || '—';
    }
    if (partyPlantId) {
      const p = await this.prisma.plant.findUnique({ where: { id: partyPlantId } });
      return p?.name || '—';
    }
    return '—';
  }

  async sodasForParty(partyKey: string, sodaType?: 'SALE' | 'PURCHASE') {
    const { partyId, partyPlantId } = this.parsePartyKey(partyKey);
    const where: any = {};
    if (partyId) where.partyId = partyId;
    if (partyPlantId) where.partyPlantId = partyPlantId;
    if (sodaType) where.sodaType = sodaType;
    const sodas = await this.prisma.financeSoda.findMany({
      where,
      include: { item: { select: { name: true } } },
      orderBy: { sodaNumber: 'asc' },
    });
    return sodas.map((s) => ({
      id: s.id,
      sodaNumber: s.sodaNumber,
      sodaType: s.sodaType,
      label: `${s.sodaType === 'SALE' ? 'SO' : 'PO'}-${String(s.sodaNumber).padStart(2, '0')} · ${s.item?.name || ''}`,
    }));
  }
}

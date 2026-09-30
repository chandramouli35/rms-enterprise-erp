import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  private roleOf(user: any) {
    return user?.role?.name || user?.role || '';
  }

  private isAdmin(user: any) {
    const r = this.roleOf(user);
    return r === 'SUPER_ADMIN' || r === 'ADMIN';
  }

  private todayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseDate(dateStr: string) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    return d;
  }

  // ─── Add Funds (Admin only) ──────────────────────────────────────────────
  async listFunds(plantId: string) {
    if (!plantId) throw new BadRequestException('Mill (plantId) is required');
    return this.prisma.expenseFund.findMany({
      where: { plantId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { plant: { select: { id: true, name: true, code: true } } },
    });
  }

  async createFund(
    data: { plantId: string; date: string; amount: number; toName: string; notes?: string },
    user: any,
  ) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Supervisor cannot add funds. Only Admin can add funds.');
    }
    if (!data.plantId) throw new BadRequestException('Select a mill');
    const plant = await this.prisma.plant.findFirst({
      where: { id: data.plantId, deletedAt: null },
    });
    if (!plant) throw new NotFoundException('Mill not found');

    const amount = Number(data.amount);
    if (!(amount > 0) || Number.isNaN(amount)) {
      throw new BadRequestException('Amount must be a positive number');
    }
    const toName = (data.toName || '').trim();
    if (!toName) throw new BadRequestException('"To" is required');

    const date = this.parseDate(data.date);
    const today = this.todayStart();
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    if (dateOnly.getTime() > today.getTime()) {
      throw new BadRequestException('Future dates are not allowed');
    }
    // Backdate: Admin only (already enforced by isAdmin). Supervisors never reach here.

    return this.prisma.expenseFund.create({
      data: {
        plantId: data.plantId,
        date,
        amount,
        toName,
        notes: data.notes?.trim() || null,
        createdById: user?.id || user?.userId || null,
      },
      include: { plant: { select: { id: true, name: true, code: true } } },
    });
  }

  // ─── Expenses (Supervisor + Admin) ───────────────────────────────────────
  async listExpenses(plantId: string) {
    if (!plantId) throw new BadRequestException('Mill (plantId) is required');
    return this.prisma.expenseEntry.findMany({
      where: { plantId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { plant: { select: { id: true, name: true, code: true } } },
    });
  }

  private async normalizeLine(line: any, index: number) {
    const amount = Number(line.amount);
    if (!(amount > 0) || Number.isNaN(amount)) {
      throw new BadRequestException(`Line ${index + 1}: Amount must be a positive number`);
    }
    const partyNa = !!line.partyNotApplicable;
    const itemsNa = !!line.itemsNotApplicable;
    const gpNa = !!line.gpNotApplicable;
    const woNa = !!line.workOrderNotApplicable;

    // Mandate: at least one of Party Name or Items (cannot mark both N/A)
    if (partyNa && itemsNa) {
      throw new BadRequestException(
        `Line ${index + 1}: Select Party Name and/or Items Bought — both cannot be Not Applicable`,
      );
    }
    // Mandate: at least one of GP No. or Work Order No. (cannot mark both N/A)
    if (gpNa && woNa) {
      throw new BadRequestException(
        `Line ${index + 1}: Enter GP No. and/or Work Order No. — both cannot be Not Applicable`,
      );
    }

    let partyId: string | null = null;
    let partyName: string | null = null;
    if (partyNa) {
      partyId = null;
      partyName = null;
    } else {
      partyId = (line.partyId || '').trim() || null;
      if (!partyId) {
        throw new BadRequestException(
          `Line ${index + 1}: Select Party Name from Master (or mark Not Applicable)`,
        );
      }
      const party = await this.prisma.financeParty.findFirst({
        where: { id: partyId, isActive: true },
      });
      if (!party) {
        throw new BadRequestException(`Line ${index + 1}: Master party not found or inactive`);
      }
      partyName = party.name;
    }

    const itemsBought = itemsNa ? null : (line.itemsBought || '').trim() || null;
    if (!itemsNa && !itemsBought) {
      throw new BadRequestException(
        `Line ${index + 1}: Items Bought / Service Availed is required (or mark Not Applicable)`,
      );
    }

    const gpNo = gpNa ? null : (line.gpNo || '').trim() || null;
    if (!gpNa && !gpNo) {
      throw new BadRequestException(
        `Line ${index + 1}: GP No. is required (or mark Not Applicable)`,
      );
    }

    const workOrderNo = woNa ? null : (line.workOrderNo || '').trim() || null;
    if (!woNa && !workOrderNo) {
      throw new BadRequestException(
        `Line ${index + 1}: Work order No. is required (or mark Not Applicable)`,
      );
    }

    return {
      partyId,
      partyName,
      partyNotApplicable: partyNa,
      itemsBought,
      itemsNotApplicable: itemsNa,
      amount,
      gpNo,
      gpNotApplicable: gpNa,
      workOrderNo,
      workOrderNotApplicable: woNa,
      notes: (line.notes || '').trim() || null,
    };
  }

  /** Active Master parties for Expense Party Name dropdown. */
  async listPartyOptions() {
    const rows = await this.prisma.financeParty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isCustomer: true, isSupplier: true },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      type:
        p.isCustomer && p.isSupplier
          ? 'Both'
          : p.isCustomer
            ? 'Customer'
            : p.isSupplier
              ? 'Supplier'
              : '—',
    }));
  }

  /** Single or multi-line mill-wise expense submit (fingerprint required). */
  async createExpenses(
    data: {
      plantId: string;
      date?: string;
      biometricData?: string;
      lines: any[];
    },
    user: any,
  ) {
    if (!data.plantId) throw new BadRequestException('Select a mill');
    const plant = await this.prisma.plant.findFirst({
      where: { id: data.plantId, deletedAt: null },
    });
    if (!plant) throw new NotFoundException('Mill not found');

    const biometricData = (data.biometricData || '').trim();
    if (!biometricData) {
      throw new BadRequestException('Fingerprint is required to submit expenses');
    }

    // Auto date = today unless Admin explicitly sends a date
    let date: Date;
    if (data.date && this.isAdmin(user)) {
      date = this.parseDate(data.date);
    } else {
      date = new Date();
    }
    const today = this.todayStart();
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    if (dateOnly.getTime() > today.getTime()) {
      throw new BadRequestException('Future dates are not allowed');
    }
    if (dateOnly.getTime() < today.getTime() && !this.isAdmin(user)) {
      throw new ForbiddenException('Only Admin can backdate expense entries');
    }

    const linesIn = Array.isArray(data.lines) ? data.lines : [];
    if (!linesIn.length) throw new BadRequestException('Add at least one expense line');

    const normalized: any[] = [];
    for (let i = 0; i < linesIn.length; i++) {
      normalized.push(await this.normalizeLine(linesIn[i], i));
    }
    const userId = user?.id || user?.userId || null;
    const submittedByName =
      user?.fullName || user?.username || user?.name || user?.role?.name || 'User';

    const created = await this.prisma.$transaction(async (tx) => {
      const entries: any[] = [];
      for (const line of normalized) {
        const entry = await tx.expenseEntry.create({
          data: {
            plantId: data.plantId,
            date,
            ...line,
            biometricData,
            submittedByName,
            createdById: userId,
          },
        });
        entries.push(entry);

        // Maintain party ledger when a Master party is selected
        if (line.partyId && !line.partyNotApplicable) {
          const bits = [
            line.itemsNotApplicable ? 'Items: N/A' : line.itemsBought ? `Items: ${line.itemsBought}` : null,
            line.gpNotApplicable ? 'GP: N/A' : line.gpNo ? `GP ${line.gpNo}` : null,
            line.workOrderNotApplicable
              ? 'WO: N/A'
              : line.workOrderNo
                ? `WO ${line.workOrderNo}`
                : null,
          ].filter(Boolean);
          await tx.financeLedgerEntry.create({
            data: {
              date,
              entryType: 'EXPENSE',
              partyId: line.partyId,
              plantId: data.plantId,
              narration: `Expense · ${bits.join(' · ') || 'Mill expense'}`,
              notes: null,
              debit: line.amount,
              credit: 0,
              createdById: userId,
            },
          });
        }
      }
      return entries;
    });

    return { count: created.length, entries: created };
  }

  /** @deprecated use createExpenses — kept for single-line callers */
  async createExpense(
    data: {
      plantId: string;
      date: string;
      amount: number;
      partyId?: string;
      partyName?: string;
      partyNotApplicable?: boolean;
      itemsBought?: string;
      itemsNotApplicable?: boolean;
      gpNo?: string;
      gpNotApplicable?: boolean;
      workOrderNo?: string;
      workOrderNotApplicable?: boolean;
      biometricData?: string;
      notes?: string;
    },
    user: any,
  ) {
    return this.createExpenses(
      {
        plantId: data.plantId,
        date: data.date,
        biometricData: data.biometricData,
        lines: [data],
      },
      user,
    );
  }

  // ─── Petty Cashbook — daily Dr/Cr + opening→closing carry-forward ────────
  private dayBounds(d: Date) {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private dateKey(d: Date) {
    const x = new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private round3(n: number) {
    return Math.round(n * 1000) / 1000;
  }

  /** Sum of all funds − expenses before a given day (= opening balance that day). */
  async openingBalanceBefore(plantId: string, day: Date) {
    const { start } = this.dayBounds(day);
    const [fundAgg, expAgg] = await Promise.all([
      this.prisma.expenseFund.aggregate({
        where: { plantId, date: { lt: start } },
        _sum: { amount: true },
      }),
      this.prisma.expenseEntry.aggregate({
        where: { plantId, date: { lt: start } },
        _sum: { amount: true },
      }),
    ]);
    return this.round3((fundAgg._sum.amount || 0) - (expAgg._sum.amount || 0));
  }

  /** One-day Petty Cash Book in client Dr/Cr format. */
  async dayBook(plantId: string, dateStr: string) {
    if (!plantId) throw new BadRequestException('Mill (plantId) is required');
    const day = this.parseDate(dateStr);
    const { start, end } = this.dayBounds(day);
    const [plant, funds, expenses, opening] = await Promise.all([
      this.prisma.plant.findUnique({
        where: { id: plantId },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.expenseFund.findMany({
        where: { plantId, date: { gte: start, lte: end } },
        orderBy: [{ createdAt: 'asc' }],
      }),
      this.prisma.expenseEntry.findMany({
        where: { plantId, date: { gte: start, lte: end } },
        orderBy: [{ createdAt: 'asc' }],
      }),
      this.openingBalanceBefore(plantId, day),
    ]);
    if (!plant) throw new NotFoundException('Mill not found');

    const totalFunds = this.round3(funds.reduce((s, f) => s + f.amount, 0));
    const totalExpenses = this.round3(expenses.reduce((s, e) => s + e.amount, 0));
    const closing = this.round3(opening + totalFunds - totalExpenses);

    const drSide = [
      { kind: 'OPENING', label: 'Opening balance', amount: opening },
      ...funds.map((f) => ({
        kind: 'FUND',
        id: f.id,
        label: f.toName || 'Add Funds',
        amount: f.amount,
      })),
      { kind: 'CLOSING', label: 'Closing balance', amount: closing },
    ];
    const crSide = expenses.map((e) => ({
      kind: 'EXPENSE',
      id: e.id,
      gpWo: e.gpNotApplicable
        ? e.workOrderNotApplicable
          ? 'N/A'
          : e.workOrderNo
            ? `W.O.No: ${e.workOrderNo}`
            : 'N/A'
        : e.gpNo
          ? `GP: ${e.gpNo}`
          : e.workOrderNotApplicable
            ? 'N/A'
            : e.workOrderNo
              ? `W.O.No: ${e.workOrderNo}`
              : '—',
      partyName: e.partyNotApplicable ? 'N/A' : e.partyName || '—',
      item: e.itemsNotApplicable ? 'N/A' : e.itemsBought || '—',
      amount: e.amount,
      by: e.submittedByName || '—',
    }));

    // Pad sides for display; totals must match (Opening+Funds = Expenses+Closing)
    const drTotal = this.round3(opening + totalFunds);
    const crTotal = this.round3(totalExpenses + closing);

    return {
      plant,
      date: this.dateKey(day),
      opening,
      closing,
      totalFunds,
      totalExpenses,
      drSide,
      crSide,
      drTotal,
      crTotal,
      hasAddFunds: funds.length > 0,
    };
  }

  /** Date-wise pages for a range (Option 1). */
  async dayBooks(plantId: string, from: string, to: string) {
    if (!from || !to) throw new BadRequestException('from and to dates are required');
    const start = this.parseDate(from);
    start.setHours(0, 0, 0, 0);
    const end = this.parseDate(to);
    end.setHours(0, 0, 0, 0);
    if (end < start) throw new BadRequestException('to must be >= from');

    const pages: any[] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      pages.push(await this.dayBook(plantId, this.dateKey(cursor)));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { plantId, from: this.dateKey(start), to: this.dateKey(end), pages };
  }

  /**
   * Compact summary (Option 2): Date | Opening | Add Funds | Expenses | Balance
   * Balance = Opening + Add Funds − Expenses; next day Opening = prior Balance.
   */
  async compactSummary(plantId: string, from?: string, to?: string) {
    if (!plantId) throw new BadRequestException('Mill (plantId) is required');
    const plant = await this.prisma.plant.findUnique({
      where: { id: plantId },
      select: { id: true, name: true, code: true },
    });
    if (!plant) throw new NotFoundException('Mill not found');

    let end = to ? this.parseDate(to) : new Date();
    end.setHours(0, 0, 0, 0);
    let start: Date;
    if (from) {
      start = this.parseDate(from);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(end);
      start.setDate(start.getDate() - 9); // default back 10 days inclusive
    }

    let opening = await this.openingBalanceBefore(plantId, start);
    const rows: any[] = [];
    let totalFunds = 0;
    let totalExpenses = 0;

    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      const { start: ds, end: de } = this.dayBounds(cursor);
      const [fundAgg, expAgg] = await Promise.all([
        this.prisma.expenseFund.aggregate({
          where: { plantId, date: { gte: ds, lte: de } },
          _sum: { amount: true },
        }),
        this.prisma.expenseEntry.aggregate({
          where: { plantId, date: { gte: ds, lte: de } },
          _sum: { amount: true },
        }),
      ]);
      const addFunds = this.round3(fundAgg._sum.amount || 0);
      const expenses = this.round3(expAgg._sum.amount || 0);
      const balance = this.round3(opening + addFunds - expenses);
      rows.push({
        date: this.dateKey(cursor),
        openingBalance: opening,
        addFunds: addFunds > 0 ? addFunds : 0,
        addFundsDisplay: addFunds > 0 ? addFunds : null,
        expenses,
        balance,
        hadAddFunds: addFunds > 0,
      });
      totalFunds = this.round3(totalFunds + addFunds);
      totalExpenses = this.round3(totalExpenses + expenses);
      opening = balance;
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      plant,
      from: this.dateKey(start),
      to: this.dateKey(end),
      rows,
      totals: {
        totalFunds,
        totalExpenses,
        closingBalance: rows.length ? rows[rows.length - 1].balance : 0,
      },
    };
  }

  /** Mill-wise expense lump-sum for chart. */
  async millWiseExpenseChart(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = this.parseDate(from);
      if (to) {
        const end = this.parseDate(to);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    const plants = await this.prisma.plant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    const series: { plantId: string; plantName: string; totalExpenses: number }[] = [];
    for (const p of plants) {
      const agg = await this.prisma.expenseEntry.aggregate({
        where: { plantId: p.id, ...where },
        _sum: { amount: true },
      });
      series.push({
        plantId: p.id,
        plantName: p.name,
        totalExpenses: this.round3(agg._sum.amount || 0),
      });
    }
    return { from: from || null, to: to || null, series };
  }

  // Legacy combined list (kept for older UI)
  async pettyCashbook(plantId: string, from?: string, to?: string) {
    return this.compactSummary(plantId, from, to);
  }

  // ─── Ticket Raise ────────────────────────────────────────────────────────
  async listTickets(plantId?: string) {
    const where: any = {};
    if (plantId) where.plantId = plantId;
    return this.prisma.expenseTicket.findMany({
      where,
      include: { plant: { select: { id: true, name: true, code: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
  }

  async listSupervisors() {
    const role = await this.prisma.role.findFirst({ where: { name: 'SUPERVISOR' } });
    if (!role) return [];
    return this.prisma.user.findMany({
      where: { roleId: role.id, deletedAt: null, isActive: true },
      select: { id: true, username: true },
      orderBy: { username: 'asc' },
    });
  }

  async createTicket(
    data: {
      plantId: string;
      date: string;
      expenseEntryId?: string;
      expenseFundId?: string;
      section?: string;
      raisedToUserId: string;
      note?: string;
    },
    user: any,
  ) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only Admin can raise tickets');
    }
    if (!data.plantId) throw new BadRequestException('Mill is required');
    if (!data.raisedToUserId) throw new BadRequestException('Select supervisor (Raised to)');

    const supervisor = await this.prisma.user.findUnique({
      where: { id: data.raisedToUserId },
      select: { id: true, username: true },
    });
    if (!supervisor) throw new NotFoundException('Supervisor not found');

    const last = await this.prisma.expenseTicket.findFirst({
      where: { plantId: data.plantId },
      orderBy: { ticketNo: 'desc' },
      select: { ticketNo: true },
    });
    const ticketNo = (last?.ticketNo || 0) + 1;
    const raisedToName = supervisor.username;
    const createdByName =
      user?.fullName || user?.username || user?.name || 'Admin';

    const ticket = await this.prisma.expenseTicket.create({
      data: {
        ticketNo,
        plantId: data.plantId,
        date: this.parseDate(data.date),
        expenseEntryId: data.expenseEntryId || null,
        expenseFundId: data.expenseFundId || null,
        section: data.section || 'Expense',
        raisedToUserId: supervisor.id,
        raisedToName,
        status: 'OPEN',
        note: data.note?.trim() || null,
        createdById: user?.id || user?.userId || null,
        createdByName,
      },
      include: { plant: { select: { id: true, name: true } } },
    });

    await this.prisma.notification.create({
      data: {
        title: `Expense Ticket #${ticketNo}`,
        message: `${createdByName} raised a clarification on ${ticket.section} (${ticket.plant?.name || ''}, ${this.dateKey(ticket.date)}). ${data.note || ''}`.trim(),
        type: 'ALERT',
        userId: supervisor.id,
      },
    });

    return ticket;
  }

  async updateTicketStatus(id: string, status: string, user: any) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only Admin can update ticket status');
    }
    const allowed = ['OPEN', 'OK', 'CLOSED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Status must be OPEN, OK, or CLOSED');
    }
    const existing = await this.prisma.expenseTicket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ticket not found');

    return this.prisma.expenseTicket.update({
      where: { id },
      data: {
        status,
        ...(status === 'CLOSED'
          ? { closedById: user?.id || user?.userId || null, closedAt: new Date() }
          : { closedById: null, closedAt: null }),
      },
      include: { plant: { select: { id: true, name: true } } },
    });
  }
}

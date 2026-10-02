import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceSodaService {
  constructor(private prisma: PrismaService) {}

  // ─── Master / Parties ────────────────────────────────────────────────────
  private partyTypeLabel(p: { isCustomer: boolean; isSupplier: boolean }) {
    if (p.isCustomer && p.isSupplier) return 'Both';
    if (p.isCustomer) return 'Customer';
    if (p.isSupplier) return 'Supplier';
    return '—';
  }

  private shapeMaster(p: any) {
    return {
      id: p.id,
      name: p.name,
      contact: p.contact,
      firmName: p.firmName,
      notes: p.notes,
      isCustomer: !!p.isCustomer,
      isSupplier: !!p.isSupplier,
      isActive: !!p.isActive,
      type: this.partyTypeLabel(p),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private assertPartyType(isCustomer: boolean, isSupplier: boolean) {
    if (!isCustomer && !isSupplier) {
      throw new BadRequestException(
        'A party must be marked as at least a Customer, a Supplier, or Both',
      );
    }
  }

  private async assertUniquePartyName(name: string, excludeId?: string) {
    const existing = await this.prisma.financeParty.findMany({
      where: excludeId ? { id: { not: excludeId } } : undefined,
      select: { id: true, name: true },
    });
    const hit = existing.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (hit) {
      throw new BadRequestException(`Duplicate master: "${hit.name}" already exists`);
    }
  }

  /** Admin Master list — includes inactive; optional type + name filters. */
  async listMasters(opts?: { type?: string; q?: string; activeOnly?: boolean }) {
    const where: any = {};
    if (opts?.activeOnly) where.isActive = true;
    const type = (opts?.type || 'ALL').toUpperCase();
    if (type === 'CUSTOMER') where.isCustomer = true;
    else if (type === 'SUPPLIER') where.isSupplier = true;
    const q = (opts?.q || '').trim();
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const rows = await this.prisma.financeParty.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return rows.map((p) => this.shapeMaster(p));
  }

  /** Active parties only (transaction dropdowns). */
  async listParties(role?: 'CUSTOMER' | 'SUPPLIER' | 'ALL') {
    const where: any = { isActive: true };
    if (role === 'CUSTOMER') where.isCustomer = true;
    if (role === 'SUPPLIER') where.isSupplier = true;
    return this.prisma.financeParty.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createParty(data: {
    name: string;
    contact?: string;
    firmName?: string;
    notes?: string;
    isCustomer?: boolean;
    isSupplier?: boolean;
  }) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Party name is required');

    // Master form always sends flags; legacy quick-add (no flags) defaults to Both
    const hasFlags = data.isCustomer !== undefined || data.isSupplier !== undefined;
    const isCustomer = hasFlags ? data.isCustomer === true : true;
    const isSupplier = hasFlags ? data.isSupplier === true : true;
    this.assertPartyType(isCustomer, isSupplier);
    await this.assertUniquePartyName(name);

    const row = await this.prisma.financeParty.create({
      data: {
        name,
        contact: data.contact?.trim() || null,
        firmName: data.firmName?.trim() || null,
        notes: data.notes?.trim() || null,
        isCustomer,
        isSupplier,
        isActive: true,
      },
    });
    return this.shapeMaster(row);
  }

  async updateParty(id: string, data: any) {
    const existing = await this.prisma.financeParty.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Master party not found');

    const name =
      data.name !== undefined ? String(data.name).trim() : existing.name;
    if (!name) throw new BadRequestException('Party name is required');
    if (name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertUniquePartyName(name, id);
    }

    const isCustomer =
      data.isCustomer !== undefined ? !!data.isCustomer : existing.isCustomer;
    const isSupplier =
      data.isSupplier !== undefined ? !!data.isSupplier : existing.isSupplier;
    if (data.isCustomer !== undefined || data.isSupplier !== undefined) {
      this.assertPartyType(isCustomer, isSupplier);
    }

    const row = await this.prisma.financeParty.update({
      where: { id },
      data: {
        name,
        ...(data.contact !== undefined ? { contact: data.contact?.trim() || null } : {}),
        ...(data.firmName !== undefined ? { firmName: data.firmName?.trim() || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
        ...(data.isCustomer !== undefined || data.isSupplier !== undefined
          ? { isCustomer, isSupplier }
          : {}),
        ...(data.isActive !== undefined ? { isActive: !!data.isActive } : {}),
      },
    });
    return this.shapeMaster(row);
  }

  /**
   * Parties + plants for inter-mill party pick.
   * role: CUSTOMER (Sales) | SUPPLIER (Purchase) | ALL
   * Inactive masters are excluded from transaction dropdowns.
   */
  async partyOptions(
    excludePlantIds: string[] = [],
    role: 'CUSTOMER' | 'SUPPLIER' | 'ALL' = 'ALL',
  ) {
    const [parties, plants] = await Promise.all([
      this.listParties(role),
      this.prisma.plant.findMany({
        where: { deletedAt: null, id: { notIn: excludePlantIds } },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      parties: parties.map((p) => ({
        id: p.id,
        name: p.name,
        kind: 'PARTY' as const,
        isCustomer: p.isCustomer,
        isSupplier: p.isSupplier,
        type: this.partyTypeLabel(p),
      })),
      plants: plants.map((p) => ({ id: p.id, name: p.name, kind: 'PLANT' as const, code: p.code })),
    };
  }

  // ─── Sequence ────────────────────────────────────────────────────────────
  async nextSodaNumber(sodaType: 'SALE' | 'PURCHASE') {
    const last = await this.prisma.financeSoda.findFirst({
      where: { sodaType },
      orderBy: { sodaNumber: 'desc' },
      select: { sodaNumber: true },
    });
    return (last?.sodaNumber || 0) + 1;
  }

  // ─── List / Report ───────────────────────────────────────────────────────
  async listSodas(sodaType?: string) {
    const plants = await this.prisma.plant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    const sodas = await this.prisma.financeSoda.findMany({
      where: sodaType ? { sodaType } : undefined,
      include: {
        item: { select: { id: true, name: true } },
        party: { select: { id: true, name: true } },
        partyPlant: { select: { id: true, name: true } },
        mills: { include: { plant: { select: { id: true, name: true, code: true } } } },
        gatePasses: {
          // F29: drafts must not affect Soda Report mill cells / status
          where: { status: { not: 'CANCELLED' }, isDraft: false },
          select: { id: true, plantId: true, status: true },
        },
        mirrorSoda: { select: { id: true, sodaType: true, sodaNumber: true } },
      },
      // Newest first so Save & Generate lands on top (incl. same-day / backdated)
      orderBy: [{ createdAt: 'desc' }, { sodaNumber: 'desc' }],
    });

    return {
      plants,
      sodas: sodas.map((s) => this.shapeSoda(s, plants)),
    };
  }

  private shapeSoda(s: any, allPlants: { id: string; name: string }[]) {
    const millIds = new Set((s.mills || []).map((m: any) => m.plantId));
    const gpByPlant: Record<string, number> = {};
    for (const p of allPlants) gpByPlant[p.id] = 0;
    for (const gp of s.gatePasses || []) {
      if (gpByPlant[gp.plantId] !== undefined) gpByPlant[gp.plantId] += 1;
      else gpByPlant[gp.plantId] = 1;
    }
    const delivered = (s.gatePasses || []).length;
    const total = s.quantity;
    const completed = delivered >= total && total > 0;
    // PDF: active → "delivered/total" (e.g. 0/3); at full → "Completed"
    const sodaStatus = completed ? 'Completed' : `${delivered}/${total}`;
    const paymentAmount =
      s.paymentAmount != null && !Number.isNaN(Number(s.paymentAmount))
        ? Number(s.paymentAmount)
        : 0;

    return {
      id: s.id,
      sodaType: s.sodaType,
      sodaNumber: s.sodaNumber,
      date: s.date,
      itemId: s.itemId,
      itemName: s.item?.name,
      partyId: s.partyId,
      partyPlantId: s.partyPlantId,
      partyName: s.party?.name || s.partyPlant?.name || '',
      rate: s.rate,
      isShift: s.isShift,
      quantity: s.quantity,
      note: s.note || '',
      paymentStatus: s.paymentStatus || 'NOT_CLEAR',
      paymentAmount,
      millIds: [...millIds],
      millCounts: gpByPlant,
      delivered,
      remaining: Math.max(0, total - delivered),
      sodaStatus,
      isCompleted: completed,
      mirrorSoda: s.mirrorSoda,
      createdAt: s.createdAt,
    };
  }

  // ─── Create ──────────────────────────────────────────────────────────────
  async createSoda(data: any, user?: any) {
    const sodaType = String(data.sodaType || '').toUpperCase();
    if (sodaType !== 'SALE' && sodaType !== 'PURCHASE') {
      throw new BadRequestException('Soda Type must be Sale or Purchase');
    }

    const date = data.date ? new Date(data.date) : new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) throw new BadRequestException('Future dates are not allowed');

    if (!data.itemId) throw new BadRequestException('Item is required');
    const quantityRaw = String(data.quantity ?? '').trim();
    const quantity = Number(quantityRaw);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Count must be an integer greater than 0');
    }
    const isShift = !!data.isShift;
    const rate = isShift ? null : parseFloat(data.rate);
    if (!isShift && (rate == null || !(rate > 0) || Number.isNaN(rate))) {
      throw new BadRequestException('Rate must be greater than 0 (or mark Shift)');
    }

    const millIds: string[] = Array.isArray(data.millIds) ? data.millIds.filter(Boolean) : [];
    if (!millIds.length) throw new BadRequestException('Select at least one mill');

    const partyId = data.partyId || null;
    const partyPlantId = data.partyPlantId || null;
    if (!partyId && !partyPlantId) throw new BadRequestException('Party is required');

    // Multi-mill: party cannot be a main mill plant
    if (millIds.length > 1 && partyPlantId) {
      throw new BadRequestException('When multiple mills are selected, Party Name cannot be a Main Mill');
    }

    // Shift case study: party should be a plant (other mill)
    if (isShift && !partyPlantId) {
      throw new BadRequestException('Shift rate requires selecting another mill as Party');
    }
    if (isShift && millIds.length !== 1) {
      throw new BadRequestException('Shift rate requires exactly one mill selected');
    }
    if (isShift && millIds[0] === partyPlantId) {
      throw new BadRequestException('Party mill must differ from selected mill for Shift');
    }

    const primary = await this.prisma.$transaction(async (tx) => {
      const createOnce = async (
        type: 'SALE' | 'PURCHASE',
        payload: any,
        plantIdsForMills: string[],
        attempts = 5,
      ): Promise<any> => {
        if (!plantIdsForMills.length) {
          throw new BadRequestException('Select at least one mill');
        }
        for (let i = 0; i < attempts; i++) {
          const sodaNumber = await this.nextNumberInTx(tx, type);
          try {
            // Create soda first, then mills explicitly (avoids nested-create orphans)
            const { mills: _ignored, ...sodaData } = payload;
            const created = await tx.financeSoda.create({
              data: { ...sodaData, sodaType: type, sodaNumber },
            });
            await tx.financeSodaMill.createMany({
              data: plantIdsForMills.map((plantId) => ({
                sodaId: created.id,
                plantId,
              })),
              skipDuplicates: true,
            });
            return tx.financeSoda.findUnique({
              where: { id: created.id },
              include: {
                item: true,
                party: true,
                partyPlant: true,
                mills: true,
              },
            });
          } catch (e: any) {
            if (e?.code === 'P2002' && i < attempts - 1) continue;
            throw e;
          }
        }
        throw new BadRequestException('Could not allocate soda number');
      };

      const created = await createOnce(
        sodaType,
        {
          date,
          itemId: data.itemId,
          partyId,
          partyPlantId,
          rate: rate as number | null,
          isShift,
          quantity,
          note: data.note || null,
          paymentStatus: 'NOT_CLEAR',
          createdById: user?.id || null,
        },
        millIds,
      );

      if (isShift && partyPlantId) {
        const reverseType = (sodaType === 'SALE' ? 'PURCHASE' : 'SALE') as 'SALE' | 'PURCHASE';
        const reverse = await createOnce(
          reverseType,
          {
            date,
            itemId: data.itemId,
            partyPlantId: millIds[0],
            rate: null,
            isShift: true,
            quantity,
            note: data.note || null,
            paymentStatus: 'NOT_CLEAR',
            mirrorSodaId: created.id,
            createdById: user?.id || null,
          },
          [partyPlantId],
        );
        await tx.financeSoda.update({
          where: { id: created.id },
          data: { mirrorSodaId: reverse.id },
        });
      }

      return created;
    });

    const list = await this.listSodas(sodaType);
    return { soda: list.sodas.find((s) => s.id === primary.id) || primary, ...list };
  }

  private async nextNumberInTx(tx: any, sodaType: string) {
    const last = await tx.financeSoda.findFirst({
      where: { sodaType },
      orderBy: { sodaNumber: 'desc' },
      select: { sodaNumber: true },
    });
    return (last?.sodaNumber || 0) + 1;
  }

  // ─── Mid-deal edit (count / note) while not completed ────────────────────
  async updateSoda(id: string, data: { quantity?: number; note?: string }, user?: any) {
    const soda = await this.prisma.financeSoda.findUnique({
      where: { id },
      include: {
        // Same rule as soda report: drafts do not count toward delivered / Completed
        gatePasses: { where: { status: { not: 'CANCELLED' }, isDraft: false } },
      },
    });
    if (!soda) throw new NotFoundException('Soda not found');
    const delivered = soda.gatePasses.length;
    if (delivered >= soda.quantity && soda.quantity > 0) {
      throw new BadRequestException('Completed sodas cannot be edited (count / note). Cancel a GP first if rollback is needed.');
    }
    if (data.quantity !== undefined) {
      const q = Number(String(data.quantity).trim());
      if (!Number.isInteger(q) || q < 1) throw new BadRequestException('Count must be an integer greater than 0');
      if (q < delivered) {
        throw new BadRequestException(`Count cannot be less than delivered gate passes (${delivered})`);
      }
    }

    // PDF: Admin only for mid-deal edits
    const roleName = user?.role?.name || user?.role;
    if (roleName !== 'SUPER_ADMIN' && roleName !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can update soda mid-deal (count / note)');
    }

    await this.prisma.financeSoda.update({
      where: { id },
      data: {
        ...(data.quantity !== undefined ? { quantity: Number(String(data.quantity).trim()) } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });

    // Mirror quantity/note if linked
    if (soda.mirrorSodaId) {
      await this.prisma.financeSoda.update({
        where: { id: soda.mirrorSodaId },
        data: {
          ...(data.quantity !== undefined ? { quantity: Number(String(data.quantity).trim()) } : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
        },
      });
    }

    return this.listSodas(soda.sodaType);
  }

  async updatePaymentStatus(id: string, paymentStatus: string, user?: any) {
    const allowed = ['CLEAR', 'UNDERWAY', 'NOT_CLEAR'];
    if (!allowed.includes(paymentStatus)) {
      throw new BadRequestException('Payment Status must be Clear, Underway, or Unclear');
    }
    const roleName = user?.role?.name || user?.role;
    if (roleName !== 'SUPER_ADMIN' && roleName !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can update Payment Status (Section L)');
    }

    const soda = await this.prisma.financeSoda.findUnique({
      where: { id },
      include: { mills: true },
    });
    if (!soda) throw new NotFoundException('Soda not found');

    const from = soda.paymentStatus;
    await this.prisma.financeSoda.updateMany({
      where: { sodaType: soda.sodaType, sodaNumber: soda.sodaNumber },
      data: { paymentStatus },
    });
    await this.prisma.financePaymentStatusAudit.create({
      data: {
        financeSodaId: id,
        fromStatus: from,
        toStatus: paymentStatus,
        changedById: user?.id || null,
      },
    });

    return this.listSodas(soda.sodaType);
  }

  /**
   * Section K is computed from Sale/Purchase Section Y totals.
   * Manual override is blocked — use report line edits / GP sync.
   */
  async setPaymentAmount(_id: string, _paymentAmount: number) {
    throw new BadRequestException(
      'Payment amount (Section K) is auto-calculated from Sale/Purchase Net Payment (Section Y). Edit CD%, oil, or bag weight on the report instead.',
    );
  }

  // ─── Available for Gate Pass ─────────────────────────────────────────────
  async availableForGatePass(plantId: string, passType: string) {
    if (!plantId) throw new BadRequestException('plantId required');
    const sodaType = passType === 'INWARD' || passType === 'IN' ? 'PURCHASE' : 'SALE';

    const plants = await this.prisma.plant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });

    const sodas = await this.prisma.financeSoda.findMany({
      where: {
        sodaType,
        mills: { some: { plantId } },
      },
      include: {
        item: { select: { id: true, name: true } },
        party: { select: { name: true } },
        partyPlant: { select: { name: true } },
        mills: true,
        gatePasses: {
          // Align with soda report: drafts do not consume visible quota / remaining
          where: { status: { not: 'CANCELLED' }, isDraft: false },
          select: { id: true, plantId: true },
        },
      },
      orderBy: { sodaNumber: 'asc' },
    });

    return sodas
      .map((s) => this.shapeSoda(s, plants))
      .filter((s) => s.remaining > 0)
      .map((s) => ({
        id: s.id,
        sodaNumber: s.sodaNumber,
        label: `${s.sodaType === 'SALE' ? 'SO' : 'PO'}-${s.sodaNumber} · ${s.itemName} · ${s.partyName} (${s.remaining} left)`,
        sodaType: s.sodaType,
        remaining: s.remaining,
        quantity: s.quantity,
        itemName: s.itemName,
        partyName: s.partyName,
      }));
  }

  /**
   * Validate soda for GP. When `tx` is provided, row-locks FinanceSoda so concurrent
   * GP creates cannot over-subscribe the quota (PDF: block beyond total limit).
   */
  async assertSodaAssignable(financeSodaId: string, plantId: string, passType: string, tx?: any) {
    const client = tx || this.prisma;
    const sodaType = passType === 'INWARD' || passType === 'IN' ? 'PURCHASE' : 'SALE';

    if (tx) {
      // Row lock (Postgres) — bump updatedAt so concurrent transactions serialize
      await tx.financeSoda.update({
        where: { id: financeSodaId },
        data: { updatedAt: new Date() },
      });
    }

    const soda = await client.financeSoda.findUnique({
      where: { id: financeSodaId },
      include: {
        mills: true,
        gatePasses: {
          where: { status: { not: 'CANCELLED' }, isDraft: false },
          select: { id: true },
        },
      },
    });
    if (!soda) throw new BadRequestException('Soda not found');
    if (soda.sodaType !== sodaType) {
      throw new BadRequestException(
        `Gate Pass ${passType} requires ${sodaType === 'PURCHASE' ? 'Purchase' : 'Sale'} sodas only`,
      );
    }
    if (!soda.mills.some((m: any) => m.plantId === plantId)) {
      throw new BadRequestException('Soda not available for this mill');
    }
    const delivered = soda.gatePasses.length;
    if (delivered >= soda.quantity) {
      throw new BadRequestException('Soda quota exhausted (Completed)');
    }
    return {
      id: soda.id,
      sodaNumber: soda.sodaNumber,
      remaining: soda.quantity - delivered,
      quantity: soda.quantity,
    };
  }

  async notifyMissingSoda(plantId: string, gatePassLabel: string) {
    const plant = await this.prisma.plant.findUnique({ where: { id: plantId } });
    const msg = `Gate Pass ${gatePassLabel} at ${plant?.name || plantId} was cut for an operational item without selecting a Finance Soda No.`;

    // Role-broadcast: Admin / Super Admin only (not all Plant Managers globally)
    await this.prisma.notification.createMany({
      data: [
        { title: 'Finance Soda missing on GP', message: msg, type: 'WARNING', role: 'SUPER_ADMIN' },
        { title: 'Finance Soda missing on GP', message: msg, type: 'WARNING', role: 'ADMIN' },
      ],
    });

    // That mill only: supervisors + plant managers (and any admin users assigned to the mill)
    const access = await this.prisma.userPlantAccess.findMany({
      where: { plantId },
      include: { user: { include: { role: true } } },
    });
    const seen = new Set<string>();
    for (const a of access) {
      const roleName = (a.user as any)?.role?.name || '';
      if (!/SUPERVISOR|PLANT_MANAGER|SUPER_ADMIN|ADMIN/i.test(roleName)) continue;
      if (seen.has(a.userId)) continue;
      seen.add(a.userId);
      await this.prisma.notification.create({
        data: {
          title: 'Finance Soda missing on GP',
          message: `[${plant?.name || plantId}] ${msg}`,
          type: 'WARNING',
          userId: a.userId,
          role: roleName,
        },
      });
    }
  }
}

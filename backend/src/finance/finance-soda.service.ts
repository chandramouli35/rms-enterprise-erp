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

  // ─── Parties ─────────────────────────────────────────────────────────────
  async listParties() {
    return this.prisma.financeParty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createParty(data: { name: string; contact?: string; firmName?: string; notes?: string }) {
    if (!data.name?.trim()) throw new BadRequestException('Party name is required');
    return this.prisma.financeParty.create({
      data: {
        name: data.name.trim(),
        contact: data.contact,
        firmName: data.firmName,
        notes: data.notes,
      },
    });
  }

  async updateParty(id: string, data: any) {
    return this.prisma.financeParty.update({
      where: { id },
      data: {
        name: data.name,
        contact: data.contact,
        firmName: data.firmName,
        notes: data.notes,
        isActive: data.isActive,
      },
    });
  }

  /** Parties + plants (for inter-mill party pick). */
  async partyOptions(excludePlantIds: string[] = []) {
    const [parties, plants] = await Promise.all([
      this.listParties(),
      this.prisma.plant.findMany({
        where: { deletedAt: null, id: { notIn: excludePlantIds } },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      parties: parties.map((p) => ({ id: p.id, name: p.name, kind: 'PARTY' as const })),
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
    const quantity = parseInt(data.quantity, 10);
    if (!quantity || quantity < 1) throw new BadRequestException('Count must be an integer greater than 0');

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
      const sodaNumber = await this.nextNumberInTx(tx, sodaType);
      const created = await tx.financeSoda.create({
        data: {
          sodaType,
          sodaNumber,
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
          mills: {
            create: millIds.map((plantId) => ({ plantId })),
          },
        },
        include: {
          item: true,
          party: true,
          partyPlant: true,
          mills: true,
        },
      });

      if (isShift && partyPlantId) {
        const reverseType = sodaType === 'SALE' ? 'PURCHASE' : 'SALE';
        const reverseNumber = await this.nextNumberInTx(tx, reverseType);
        const reverse = await tx.financeSoda.create({
          data: {
            sodaType: reverseType,
            sodaNumber: reverseNumber,
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
            mills: { create: [{ plantId: partyPlantId }] },
          },
        });
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
      const q = parseInt(String(data.quantity), 10);
      if (!q || q < 1) throw new BadRequestException('Count must be > 0');
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
        ...(data.quantity !== undefined ? { quantity: parseInt(String(data.quantity), 10) } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });

    // Mirror quantity/note if linked
    if (soda.mirrorSodaId) {
      await this.prisma.financeSoda.update({
        where: { id: soda.mirrorSodaId },
        data: {
          ...(data.quantity !== undefined ? { quantity: parseInt(String(data.quantity), 10) } : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
        },
      });
    }

    return this.listSodas(soda.sodaType);
  }

  async updatePaymentStatus(id: string, paymentStatus: string, user?: any) {
    const allowed = ['CLEAR', 'UNDERWAY', 'NOT_CLEAR'];
    if (!allowed.includes(paymentStatus)) {
      throw new BadRequestException('Payment Status must be Clear, Underway, or Not Clear');
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

  /** F29 will push real bill amounts; until then allow explicit set / keep 0 (never null). */
  async setPaymentAmount(id: string, paymentAmount: number) {
    const amt = Number(paymentAmount);
    if (Number.isNaN(amt) || amt < 0) throw new BadRequestException('Invalid payment amount');
    const soda = await this.prisma.financeSoda.findUnique({ where: { id } });
    if (!soda) throw new NotFoundException('Soda not found');
    await this.prisma.financeSoda.update({
      where: { id },
      data: { paymentAmount: amt },
    });
    return this.listSodas(soda.sodaType);
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

    // Role-broadcast (admin)
    await this.prisma.notification.createMany({
      data: [
        { title: 'Finance Soda missing on GP', message: msg, type: 'WARNING', role: 'SUPER_ADMIN' },
        { title: 'Finance Soda missing on GP', message: msg, type: 'WARNING', role: 'PLANT_MANAGER' },
      ],
    });

    // Respective supervisors / managers of THAT mill
    const access = await this.prisma.userPlantAccess.findMany({
      where: { plantId },
      include: { user: { include: { role: true } } },
    });
    for (const a of access) {
      const roleName = (a.user as any)?.role?.name || '';
      if (!/SUPERVISOR|PLANT_MANAGER|SUPER_ADMIN|ADMIN/i.test(roleName)) continue;
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

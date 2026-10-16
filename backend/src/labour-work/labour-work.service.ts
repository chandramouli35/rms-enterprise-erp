import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

type TaskSeed = { name: string; rate: number | null; direction: 'LOAD' | 'UNLOAD' | 'OTHER' };

const CATALOG: Array<{
  group: string;
  unit: string;
  manual: boolean;
  items: string[];
  tasks: TaskSeed[];
}> = [
  {
    group: 'RICE',
    unit: 'bag',
    manual: false,
    items: ['Rice', 'Broken Rice', 'Nakku 1', 'Nakku 2', 'Rejection', 'Wand', 'Mansoori', 'Parmal'],
    tasks: [
      { name: 'Bharai-Salai', rate: 5.35, direction: 'OTHER' },
      { name: 'Load', rate: 2.38, direction: 'LOAD' },
      { name: 'Unload', rate: 2.38, direction: 'UNLOAD' },
      { name: 'Rice Stack', rate: 2.43, direction: 'OTHER' },
    ],
  },
  {
    group: 'PADDY',
    unit: 'bag',
    manual: false,
    items: ['Paddy'],
    tasks: [
      { name: 'Load', rate: 2.05, direction: 'LOAD' },
      { name: 'Unload', rate: 2.05, direction: 'UNLOAD' },
      { name: 'Salai', rate: 0.69, direction: 'OTHER' },
      { name: 'Katai', rate: 0.69, direction: 'OTHER' },
      { name: 'Paddy Stack', rate: 2.1, direction: 'OTHER' },
      { name: 'Bharai & Salai', rate: 3.9, direction: 'OTHER' },
    ],
  },
  {
    group: 'BRAN',
    unit: 'bag',
    manual: false,
    items: ['Bran', 'K. Bhusi'],
    tasks: [{ name: 'Salai & Load', rate: 2.05, direction: 'LOAD' }],
  },
  {
    group: 'BALES',
    unit: 'bale',
    manual: false,
    items: ['Bales'],
    tasks: [
      { name: 'Load', rate: 50.8, direction: 'LOAD' },
      { name: 'Unload', rate: 50.8, direction: 'UNLOAD' },
    ],
  },
  {
    group: 'BARDANA',
    unit: 'bundal',
    manual: false,
    items: ['Bardana Bundal'],
    tasks: [
      { name: 'Load', rate: 1.83, direction: 'LOAD' },
      { name: 'Unload', rate: 1.83, direction: 'UNLOAD' },
    ],
  },
  {
    group: 'CORN',
    unit: 'bag',
    manual: true,
    items: ['Corns', 'Corn Grits'],
    tasks: [
      { name: 'Load', rate: null, direction: 'LOAD' },
      { name: 'Unload', rate: null, direction: 'UNLOAD' },
      { name: 'Salai', rate: null, direction: 'OTHER' },
      { name: 'Katai', rate: null, direction: 'OTHER' },
      { name: 'Stack', rate: null, direction: 'OTHER' },
      { name: 'Bharai & Salai', rate: null, direction: 'OTHER' },
    ],
  },
];

const BACKDATE_KEY = 'labourWoBackdate';

@Injectable()
export class LabourWorkService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  private roleName(user: any) {
    return String(user?.role?.name || user?.role || '');
  }

  private isFullAdmin(user: any) {
    return /SUPER_ADMIN|^ADMIN$/i.test(this.roleName(user).trim()) || this.roleName(user) === 'ADMIN';
  }

  private displayName(user: any) {
    return (
      user?.name ||
      user?.fullName ||
      user?.username ||
      user?.email ||
      'Supervisor'
    );
  }

  private money(n: number) {
    return Math.round(n * 100) / 100;
  }

  async ensureCatalog() {
    let order = 0;
    for (const group of CATALOG) {
      for (const itemName of group.items) {
        order += 1;
        const item = await this.prisma.labourWorkItem.upsert({
          where: { name: itemName },
          update: {},
          create: {
            name: itemName,
            groupName: group.group,
            unitLabel: group.unit,
            ratesManualOnly: group.manual,
            sortOrder: order,
          },
        });
        for (const task of group.tasks) {
          await this.prisma.labourWorkTask.upsert({
            where: { itemId_name: { itemId: item.id, name: task.name } },
            update: { direction: task.direction },
            create: {
              itemId: item.id,
              name: task.name,
              direction: task.direction,
            },
          });
        }
      }
    }
  }

  private defaultRate(itemName: string, taskName: string): number | null {
    for (const group of CATALOG) {
      if (!group.items.includes(itemName)) continue;
      const task = group.tasks.find((t) => t.name === taskName);
      return task ? task.rate : null;
    }
    return null;
  }

  async ensurePlantRates(plantId: string) {
    await this.ensureCatalog();
    const tasks = await this.prisma.labourWorkTask.findMany({
      include: { item: true },
    });
    for (const task of tasks) {
      const existing = await this.prisma.labourWorkRate.findUnique({
        where: {
          plantId_labourPartyId_taskId: {
            plantId,
            labourPartyId: '',
            taskId: task.id,
          },
        },
      });
      if (existing) continue;
      const seeded = this.defaultRate(task.item.name, task.name);
      await this.prisma.labourWorkRate.create({
        data: {
          plantId,
          labourPartyId: '',
          taskId: task.id,
          rate: seeded == null ? 0 : seeded,
        },
      });
    }
  }

  async catalog(plantId: string) {
    if (plantId && plantId !== 'global') await this.ensurePlantRates(plantId);
    else await this.ensureCatalog();
    const items = await this.prisma.labourWorkItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        tasks: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, direction: true },
        },
      },
    });
    return items;
  }

  async rates(plantId: string, labourPartyId?: string) {
    if (!plantId || plantId === 'global') {
      throw new BadRequestException('Select a mill');
    }
    await this.ensurePlantRates(plantId);
    const partyKey = String(labourPartyId || '').trim();
    const tasks = await this.prisma.labourWorkTask.findMany({
      where: { isActive: true, item: { isActive: true } },
      include: { item: true },
      orderBy: [{ item: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
    const rows = await this.prisma.labourWorkRate.findMany({
      where: {
        plantId,
        labourPartyId: { in: partyKey ? ['', partyKey] : [''] },
      },
    });
    return tasks.map((task) => {
      const mill = rows.find((r) => r.taskId === task.id && r.labourPartyId === '');
      const party = partyKey
        ? rows.find((r) => r.taskId === task.id && r.labourPartyId === partyKey)
        : null;
      return {
        taskId: task.id,
        taskName: task.name,
        direction: task.direction,
        itemId: task.itemId,
        itemName: task.item.name,
        groupName: task.item.groupName,
        unitLabel: task.item.unitLabel,
        ratesManualOnly: task.item.ratesManualOnly,
        millRate: mill?.rate ?? 0,
        partyRate: party?.rate ?? null,
        rate: party ? party.rate : mill?.rate ?? 0,
      };
    });
  }

  async saveRates(
    plantId: string,
    labourPartyId: string | undefined,
    updates: Array<{ taskId: string; rate: number }>,
    user: any,
  ) {
    if (!plantId || plantId === 'global') throw new BadRequestException('Select a mill');
    const partyKey = String(labourPartyId || '').trim();
    const tasks = await this.prisma.labourWorkTask.findMany({
      where: { id: { in: updates.map((u) => u.taskId) } },
      include: { item: true },
    });
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const row of updates) {
      const task = byId.get(row.taskId);
      if (!task) throw new BadRequestException('Unknown task');
      if (task.item.ratesManualOnly && !this.isFullAdmin(user)) {
        throw new BadRequestException('Corn rates can only be updated by admin');
      }
      const rate = Number(row.rate);
      if (!Number.isFinite(rate) || rate < 0) {
        throw new BadRequestException('Rate must be a number zero or more');
      }
      await this.prisma.labourWorkRate.upsert({
        where: {
          plantId_labourPartyId_taskId: {
            plantId,
            labourPartyId: partyKey,
            taskId: task.id,
          },
        },
        update: { rate: this.money(rate) },
        create: {
          plantId,
          labourPartyId: partyKey,
          taskId: task.id,
          rate: this.money(rate),
        },
      });
    }
    return this.rates(plantId, partyKey);
  }

  async addItem(data: { name: string; groupName?: string; unitLabel?: string; taskNames?: string[] }, user: any) {
    if (!this.isFullAdmin(user)) {
      throw new BadRequestException('Only admin can add a product');
    }
    const name = String(data.name || '').trim();
    if (!name) throw new BadRequestException('Product name is required');
    const item = await this.prisma.labourWorkItem.upsert({
      where: { name },
      update: { isActive: true },
      create: {
        name,
        groupName: String(data.groupName || 'CUSTOM').trim() || 'CUSTOM',
        unitLabel: String(data.unitLabel || 'bag').trim() || 'bag',
        ratesManualOnly: false,
        sortOrder: 1000,
      },
    });
    const names = (data.taskNames || []).map((n) => String(n || '').trim()).filter(Boolean);
    for (const taskName of names) {
      await this.addTask({ itemId: item.id, name: taskName }, user);
    }
    return item;
  }

  async addTask(data: { itemId: string; name: string; direction?: string }, user: any) {
    if (!this.isFullAdmin(user)) {
      throw new BadRequestException('Only admin can add a task');
    }
    const name = String(data.name || '').trim();
    if (!data.itemId || !name) throw new BadRequestException('Item and task name are required');
    const raw = String(data.direction || '').toUpperCase();
    const inferred = /unload/i.test(name) ? 'UNLOAD' : /\bload\b/i.test(name) ? 'LOAD' : 'OTHER';
    const direction = ['LOAD', 'UNLOAD', 'OTHER'].includes(raw) && data.direction ? raw : inferred;
    return this.prisma.labourWorkTask.upsert({
      where: { itemId_name: { itemId: data.itemId, name } },
      update: { isActive: true, direction },
      create: { itemId: data.itemId, name, direction },
    });
  }

  async parties(plantId: string) {
    return this.prisma.labourMaster.findMany({
      where: {
        isActive: true,
        ...(plantId && plantId !== 'global' ? { plantId } : {}),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, firmName: true, plantId: true },
    });
  }

  async gatePasses(plantId: string) {
    if (!plantId || plantId === 'global') return [];
    return this.prisma.gatePass.findMany({
      where: { plantId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        qrCode: true,
        passType: true,
        vehicleNo: true,
        partyName: true,
        status: true,
        createdAt: true,
        items: { select: { itemName: true, quantity: true, unit: true } },
      },
    });
  }

  async backdateSetting() {
    const row = await this.prisma.globalSetting.findUnique({ where: { key: BACKDATE_KEY } });
    return { backdate: row?.value === 'on' ? 'on' : 'off' };
  }

  async setBackdate(value: string, user: any) {
    if (!this.isFullAdmin(user)) {
      throw new BadRequestException('Only admin can change the back-date setting');
    }
    const v = value === 'on' ? 'on' : 'off';
    await this.prisma.globalSetting.upsert({
      where: { key: BACKDATE_KEY },
      update: { value: v },
      create: { key: BACKDATE_KEY, value: v },
    });
    return { backdate: v };
  }

  private async rateFor(plantId: string, labourPartyId: string | null, taskId: string) {
    const partyKey = labourPartyId || '';
    if (partyKey) {
      const party = await this.prisma.labourWorkRate.findUnique({
        where: {
          plantId_labourPartyId_taskId: { plantId, labourPartyId: partyKey, taskId },
        },
      });
      if (party) return party.rate;
    }
    const mill = await this.prisma.labourWorkRate.findUnique({
      where: {
        plantId_labourPartyId_taskId: { plantId, labourPartyId: '', taskId },
      },
    });
    return mill?.rate ?? 0;
  }

  private itemTypeFor(groupName: string, itemName: string) {
    const g = String(groupName || '').toUpperCase();
    const n = String(itemName || '').toUpperCase();
    if (g === 'PADDY' || n.includes('PADDY')) return 'PADDY';
    if (g === 'RICE' || n.includes('RICE')) return 'RICE';
    if (g === 'BRAN' || n.includes('BRAN') || n.includes('BHUSI')) return 'BRAN';
    if (n.includes('HUSK')) return 'HUSK';
    return 'CONSUMABLES';
  }

  private async onHand(tx: any, plantId: string, itemName: string) {
    const rows = await tx.inventory.findMany({
      where: { plantId, variety: { equals: itemName, mode: 'insensitive' } },
    });
    return rows.reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0);
  }

  private async postPayable(
    tx: any,
    order: { id: string; plantId: string; date: Date; workOrderNo: number; labourPartyId: string | null; itemName: string },
    amount: number,
  ) {
    if (!order.labourPartyId || !(amount > 0)) return;
    const narration = `Work Order Bill No. ${order.workOrderNo} · ${order.itemName}`;
    const existing = await tx.financeLedgerEntry.findFirst({
      where: { entryType: 'LABOUR', narration, labourPartyId: order.labourPartyId, plantId: order.plantId },
    });
    if (existing) return;
    await tx.financeLedgerEntry.create({
      data: {
        date: order.date,
        entryType: 'LABOUR',
        labourPartyId: order.labourPartyId,
        plantId: order.plantId,
        narration,
        credit: this.money(amount),
        debit: 0,
      },
    });
  }

  async createManual(data: any, user: any) {
    const plantId = String(data.plantId || '').trim();
    if (!plantId || plantId === 'global') throw new BadRequestException('Select a mill');
    const intermill = !!data.intermill;
    const gatePassId = intermill ? null : String(data.gatePassId || '').trim() || null;
    if (intermill && data.gatePassId) {
      throw new BadRequestException('Choose either a GP or Inter-Mill Movement');
    }
    if (!intermill && !gatePassId) {
      throw new BadRequestException('Select a GP, or tick Inter-Mill Movement');
    }
    const labourPartyId = String(data.labourPartyId || '').trim();
    if (!labourPartyId) throw new BadRequestException('Labour Party is required');
    const quantity = Number(data.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new BadRequestException('Pcs / Bags must be a whole number greater than 0');
    }
    const taskIds: string[] = Array.isArray(data.taskIds) ? data.taskIds.filter(Boolean) : [];
    if (!taskIds.length) throw new BadRequestException('Select at least one task');
    const wantFingerprint = !!data.updateWithFingerprint;
    const token = String(data.fingerprintToken || '').trim();
    if (wantFingerprint && !token) {
      throw new BadRequestException('Fingerprint is required when Update with Fingerprint is ticked');
    }
    const setting = await this.backdateSetting();
    let date = new Date();
    if (setting.backdate === 'on' && data.date) {
      const parsed = new Date(data.date);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date');
      date = parsed;
    }

    await this.ensurePlantRates(plantId);
    const item = await this.prisma.labourWorkItem.findFirst({
      where: { id: data.itemId, isActive: true },
      include: { tasks: { where: { isActive: true } } },
    });
    if (!item) throw new BadRequestException('Select an item');
    const chosen = item.tasks.filter((t) => taskIds.includes(t.id));
    if (chosen.length !== taskIds.length) {
      throw new BadRequestException('Tasks must belong to the selected item');
    }
    const dirs = new Set(chosen.map((t) => t.direction));
    if (dirs.has('LOAD') && dirs.has('UNLOAD')) {
      throw new BadRequestException('Loading and unloading cannot both be selected on one work order');
    }

    let pass: any = null;
    if (gatePassId) {
      pass = await this.prisma.gatePass.findFirst({ where: { id: gatePassId, plantId } });
      if (!pass) throw new BadRequestException('GP was not cut at this mill');
    }

    const party = await this.prisma.labourMaster.findFirst({
      where: { id: labourPartyId, plantId, isActive: true },
    });
    if (!party) throw new BadRequestException('Labour Party is not on this mill');

    const lines: Array<{ taskId: string; taskName: string; rate: number; amount: number }> = [];
    for (const task of chosen) {
      const rate = await this.rateFor(plantId, labourPartyId, task.id);
      lines.push({
        taskId: task.id,
        taskName: task.name,
        rate: this.money(rate),
        amount: this.money(rate * quantity),
      });
    }

    const affectsStock = !intermill && !!pass;
    const stockOut = affectsStock && pass?.passType === 'OUTWARD';
    const stockIn = affectsStock && !stockOut;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`labour-wo:${plantId}`})::bigint)`;
      const stockUnits = item.unitLabel === 'bundal' ? quantity * 50 : quantity;
      if (stockOut) {
        const have = await this.onHand(tx, plantId, item.name);
        if (have < stockUnits) {
          throw new BadRequestException(
            `Not enough ${item.name} in stock (${have}). This entry would go negative.`,
          );
        }
      }
      const last = await tx.labourWorkOrder.findFirst({
        where: { plantId },
        orderBy: { workOrderNo: 'desc' },
        select: { workOrderNo: true },
      });
      const workOrderNo = Number(last?.workOrderNo || 0) + 1;
      const order = await tx.labourWorkOrder.create({
        data: {
          plantId,
          workOrderNo,
          date,
          labourPartyId,
          source: 'MANUAL',
          mode: intermill ? 'INTERMILL' : 'GP',
          gatePassId,
          itemId: item.id,
          itemName: item.name,
          quantity,
          note: String(data.note || '').trim() || null,
          fingerprintName: wantFingerprint ? this.displayName(user) : null,
          affectsStock,
          createdById: user?.id || user?.userId || null,
          lines: { create: lines },
        },
        include: { lines: true, labourParty: true, gatePass: true },
      });
      if (affectsStock) {
        const change = stockOut ? -stockUnits : stockIn ? stockUnits : 0;
        if (change !== 0) {
          await this.inventory.adjustStock({
            plantId,
            itemType: this.itemTypeFor(item.groupName, item.name),
            variety: item.name,
            quantityChange: change,
            transactionType: change > 0 ? 'IN' : 'OUT',
            referenceId: order.id,
            remarks: `Labour work order ${workOrderNo}`,
            unit: item.unitLabel === 'bundal' ? 'Bags' : item.unitLabel,
            tx,
          });
        }
      }
      const amount = lines.reduce((s, l) => s + l.amount, 0);
      await this.postPayable(tx, order, amount);
      return order;
    });
  }

  async list(plantId: string, date?: string, labourPartyId?: string) {
    const where: any = {};
    if (plantId && plantId !== 'global') where.plantId = plantId;
    if (labourPartyId) where.labourPartyId = labourPartyId;
    if (date) {
      const start = new Date(`${date}T00:00:00.000+05:30`);
      const end = new Date(`${date}T23:59:59.999+05:30`);
      where.date = { gte: start, lte: end };
    }
    const orders = await this.prisma.labourWorkOrder.findMany({
      where,
      include: {
        lines: true,
        labourParty: { select: { id: true, name: true } },
        gatePass: { select: { id: true, qrCode: true, passType: true } },
        plant: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { workOrderNo: 'desc' }],
      take: 500,
    });
    const rows = orders.flatMap((order) =>
      order.lines.map((line) => ({
        id: line.id,
        orderId: order.id,
        workOrderNo: order.workOrderNo,
        billNo: order.workOrderNo,
        date: order.date,
        plantId: order.plantId,
        plantName: order.plant?.name || '',
        labourPartyId: order.labourPartyId,
        labourPartyName: order.labourParty?.name || '—',
        itemName: order.itemName,
        taskName: line.taskName,
        quantity: order.quantity,
        rate: line.rate,
        amount: line.amount,
        mode: order.mode,
        source: order.source,
        gpNo: order.gatePass?.qrCode || null,
        note: order.note,
        fingerprintName: order.fingerprintName,
      })),
    );
    const parties = new Map<string, { labourPartyName: string; amount: number; rows: typeof rows }>();
    for (const row of rows) {
      const key = row.labourPartyId || 'none';
      const bucket = parties.get(key) || {
        labourPartyName: row.labourPartyName,
        amount: 0,
        rows: [] as typeof rows,
      };
      bucket.rows.push(row);
      bucket.amount = this.money(bucket.amount + row.amount);
      parties.set(key, bucket);
    }
    return {
      rows,
      parties: [...parties.values()],
      total: this.money(rows.reduce((s, r) => s + r.amount, 0)),
    };
  }

  private async allocateNo(tx: any, plantId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`labour-wo:${plantId}`})::bigint)`;
    const last = await tx.labourWorkOrder.findFirst({
      where: { plantId },
      orderBy: { workOrderNo: 'desc' },
      select: { workOrderNo: true },
    });
    return Number(last?.workOrderNo || 0) + 1;
  }

  /** GP lines that should become a work order. Bag count follows the GP total bags. */
  private gatePassWorkLines(pass: any): Array<{ name: string; qty: number }> {
    const items = Array.isArray(pass.items) ? pass.items : [];
    const bagTotal =
      (Number(pass.mainBags) || 0) + (Number(pass.shortageBags) || 0) ||
      Number(pass.noOfBags) ||
      0;
    if (!items.length && pass.material) {
      const qty = Math.round(bagTotal || Number(pass.netWeight) || 0);
      return qty > 0 ? [{ name: String(pass.material).trim(), qty }] : [];
    }
    const firstBag = items.findIndex((item: any) => {
      const unit = String(item.unit || '').toUpperCase();
      return unit.includes('BAG') || unit === 'NOS';
    });
    return items
      .map((item: any, idx: number) => {
        const unit = String(item.unit || '').toUpperCase();
        const isBag = unit.includes('BAG') || unit === 'NOS';
        let qty = Math.round(Number(item.quantity) || 0);
        if (isBag && bagTotal > 0 && idx === firstBag) qty = Math.round(bagTotal);
        return { name: String(item.itemName || '').trim(), qty };
      })
      .filter((row) => row.name && row.qty > 0);
  }

  async syncFromGatePass(gatePassId: string) {
    const pass = await this.prisma.gatePass.findUnique({
      where: { id: gatePassId },
      include: { items: true, procurementBatch: { select: { id: true } } },
    });
    if (!pass || pass.status === 'CANCELLED') return;
    await this.ensurePlantRates(pass.plantId);
    const catalog = await this.prisma.labourWorkItem.findMany({
      where: { isActive: true },
      include: { tasks: true },
    });
    const taskName = pass.passType === 'OUTWARD' ? 'Load' : 'Unload';
    const paddyAlreadyBooked = !!pass.procurementBatch;
    for (const line of this.gatePassWorkLines(pass)) {
      const itemName = line.name;
      const key = itemName.toLowerCase();
      if (paddyAlreadyBooked && key.includes('paddy')) continue;
      const catalogItem =
        catalog.find((c) => c.name.toLowerCase() === key) ||
        catalog
          .filter((c) => key.includes(c.name.toLowerCase()))
          .sort((a, b) => b.name.length - a.name.length)[0];
      if (!catalogItem) continue;
      const task = catalogItem.tasks.find((t) => t.name === taskName);
      if (!task) continue;
      const sourceRef = `gp:${pass.id}:${itemName.toLowerCase()}`;
      const existing = await this.prisma.labourWorkOrder.findUnique({ where: { sourceRef } });
      if (existing) continue;
      const qty = line.qty;
      if (qty <= 0) continue;
      const rate = await this.rateFor(pass.plantId, pass.labourPartyId, task.id);
      const amount = this.money(rate * qty);
      await this.prisma.$transaction(async (tx) => {
        const again = await tx.labourWorkOrder.findUnique({ where: { sourceRef } });
        if (again) return;
        const workOrderNo = await this.allocateNo(tx, pass.plantId);
        const order = await tx.labourWorkOrder.create({
          data: {
            plantId: pass.plantId,
            workOrderNo,
            date: pass.gpCompleteDate || new Date(),
            labourPartyId: pass.labourPartyId,
            source: 'GP_AUTO',
            mode: 'GP',
            gatePassId: pass.id,
            itemId: catalogItem.id,
            itemName: catalogItem.name,
            quantity: qty,
            note: pass.passType === 'OUTWARD' ? 'Item Loading' : 'Item Unloading',
            affectsStock: false,
            sourceRef,
            lines: {
              create: [{ taskId: task.id, taskName: task.name, rate: this.money(rate), amount }],
            },
          },
        });
        await this.postPayable(tx, order, amount);
      });
    }
  }

  async syncFromInward(batchId: string) {
    const batch = await this.prisma.procurementBatch.findUnique({
      where: { id: batchId },
      include: { paddyInwardDetails: true },
    });
    const d = batch?.paddyInwardDetails;
    if (!batch || !d) return;
    if (!['CONFIRMED', 'COMPLETED'].includes(String(batch.status || ''))) return;
    const sourceRef = `inward:${batch.id}`;
    const existing = await this.prisma.labourWorkOrder.findUnique({ where: { sourceRef } });
    if (existing) return;
    await this.ensurePlantRates(batch.plantId);
    const item = await this.prisma.labourWorkItem.findFirst({
      where: { name: 'Paddy' },
      include: { tasks: true },
    });
    const task = item?.tasks.find((t) => t.name === 'Unload');
    if (!item || !task) return;
    const qty = Math.round(Number(d.bagsRecAtMill) || 0);
    if (qty <= 0) return;
    const partyName = String(d.labourType || '').trim();
    const party = partyName
      ? await this.prisma.labourMaster.findFirst({
          where: { plantId: batch.plantId, isActive: true, name: { equals: partyName, mode: 'insensitive' } },
        })
      : null;
    const rate = await this.rateFor(batch.plantId, party?.id || null, task.id);
    const amount = this.money(rate * qty);
    await this.prisma.$transaction(async (tx) => {
      const again = await tx.labourWorkOrder.findUnique({ where: { sourceRef } });
      if (again) return;
      const workOrderNo = await this.allocateNo(tx, batch.plantId);
      const order = await tx.labourWorkOrder.create({
        data: {
          plantId: batch.plantId,
          workOrderNo,
          date: new Date(),
          labourPartyId: party?.id || null,
          source: 'INWARD_AUTO',
          mode: 'GP',
          inwardId: batch.id,
          itemId: item.id,
          itemName: item.name,
          quantity: qty,
          note: 'Item Unloading',
          affectsStock: false,
          sourceRef,
          lines: {
            create: [{ taskId: task.id, taskName: task.name, rate: this.money(rate), amount }],
          },
        },
      });
      await this.postPayable(tx, order, amount);
    });
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DieselService {
  constructor(private prisma: PrismaService) {}

  private round3(n: number) {
    return Math.round(n * 1000) / 1000;
  }

  private roleOf(user: any) {
    return user?.role?.name || user?.role || '';
  }

  async listTrucks() {
    return this.prisma.truckMaster.findMany({
      where: { isApproved: true },
      orderBy: { truckNumber: 'asc' },
      select: {
        id: true,
        truckNumber: true,
        vehicleType: true,
        readingUnit: true,
        plantId: true,
      },
    });
  }

  async listDrivers() {
    const [staff, drivers] = await Promise.all([
      this.prisma.staffMaster.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, role: true, plantId: true },
      }),
      this.prisma.driverMaster.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, plantId: true },
      }),
    ]);
    return {
      staff: staff.map((s) => ({ id: s.id, name: s.name, kind: 'STAFF' as const, role: s.role })),
      drivers: drivers.map((d) => ({
        id: d.id,
        name: d.name,
        kind: 'DRIVER' as const,
      })),
    };
  }

  async listParties() {
    // Pump / Party Master (active)
    return this.prisma.financeParty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async lastEntryForTruck(truckId: string) {
    const last = await this.prisma.dieselFuelEntry.findFirst({
      where: { truckId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        plant: { select: { id: true, name: true } },
        party: { select: { id: true, name: true } },
      },
    });
    const truck = await this.prisma.truckMaster.findUnique({ where: { id: truckId } });
    if (!truck) throw new NotFoundException('Truck not found');
    return {
      truck: {
        id: truck.id,
        truckNumber: truck.truckNumber,
        vehicleType: truck.vehicleType,
        readingUnit: truck.readingUnit,
      },
      lastEntry: last
        ? {
            id: last.id,
            date: last.date,
            slipNo: last.slipNo,
            truckType: last.truckType,
            readingUnit: last.readingUnit,
            newReading: last.newReading,
            average: last.average,
            plantName: last.plant?.name,
            partyName: last.partyName || last.party?.name,
            submittedByName: last.submittedByName,
            dieselQty: last.dieselQty,
          }
        : null,
      oldReading: last?.newReading ?? 0,
      oldAverage: last?.average ?? 0,
      oldSlipNo: last?.slipNo ?? 0,
      truckType: truck.vehicleType,
      readingUnit: truck.readingUnit,
    };
  }

  async createEntry(
    data: {
      date?: string;
      truckId: string;
      plantId: string;
      slipNo: number;
      newReading: number;
      dieselQty: number;
      rate: number;
      partyId?: string;
      driverStaffId?: string;
      driverMasterId?: string;
      driverName?: string;
      biometricData?: string;
    },
    user: any,
  ) {
    const biometric = (data.biometricData || '').trim();
    if (!biometric) throw new BadRequestException('Fingerprint is required to submit');

    if (!data.truckId) throw new BadRequestException('Select truck number');
    if (!data.plantId) throw new BadRequestException('Select mill name');

    const truck = await this.prisma.truckMaster.findUnique({ where: { id: data.truckId } });
    if (!truck || !truck.isApproved) throw new NotFoundException('Approved truck not found');

    const plant = await this.prisma.plant.findFirst({
      where: { id: data.plantId, deletedAt: null },
    });
    if (!plant) throw new NotFoundException('Mill not found');

    const slipNo = Number(data.slipNo);
    if (!Number.isFinite(slipNo) || slipNo <= 0) {
      throw new BadRequestException('Slip No. must be a positive number');
    }

    const last = await this.prisma.dieselFuelEntry.findFirst({
      where: { truckId: data.truckId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    const oldReading = last?.newReading ?? 0;
    const oldAverage = last?.average ?? 0;
    const oldSlip = last?.slipNo ?? 0;
    if (slipNo <= oldSlip) {
      throw new BadRequestException(`Slip No. must be greater than previous slip (${oldSlip})`);
    }

    const newReading = Number(data.newReading);
    if (!Number.isFinite(newReading)) throw new BadRequestException('Invalid new reading');
    if (newReading <= oldReading) {
      throw new BadRequestException(
        `New Reading must be greater than Old Reading (${oldReading})`,
      );
    }

    const dieselQty = Number(data.dieselQty);
    if (!(dieselQty > 0)) throw new BadRequestException('Diesel Quantity must be greater than 0');

    const rate = Number(data.rate);
    if (!(rate > 0)) throw new BadRequestException('Rate must be greater than 0');

    const totalRun = this.round3(newReading - oldReading);
    const average = this.round3(totalRun / dieselQty);
    const amount = this.round3(dieselQty * rate);

    let partyId: string | null = data.partyId || null;
    let partyName: string | null = null;
    if (partyId) {
      const party = await this.prisma.financeParty.findFirst({
        where: { id: partyId, isActive: true },
      });
      if (!party) throw new BadRequestException('Party / Pump not found');
      partyName = party.name;
    }

    let driverStaffId: string | null = data.driverStaffId || null;
    let driverMasterId: string | null = data.driverMasterId || null;
    let driverName = (data.driverName || '').trim() || null;
    if (driverStaffId) {
      const s = await this.prisma.staffMaster.findUnique({ where: { id: driverStaffId } });
      if (!s) throw new BadRequestException('Driver (staff) not found');
      driverName = s.name;
      driverMasterId = null;
    } else if (driverMasterId) {
      const d = await this.prisma.driverMaster.findUnique({ where: { id: driverMasterId } });
      if (!d) throw new BadRequestException('Driver not found');
      driverName = d.name;
      driverStaffId = null;
    }
    if (!driverName) throw new BadRequestException('Select Driver Name');

    const date = data.date ? new Date(data.date) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    const submittedByName =
      user?.fullName || user?.username || user?.name || this.roleOf(user) || 'User';

    return this.prisma.dieselFuelEntry.create({
      data: {
        date,
        truckId: truck.id,
        plantId: plant.id,
        slipNo,
        truckType: truck.vehicleType,
        readingUnit: truck.readingUnit,
        oldReading,
        oldAverage,
        newReading,
        dieselQty,
        totalRun,
        average,
        rate,
        amount,
        partyId,
        partyName,
        driverStaffId,
        driverMasterId,
        driverName,
        biometricData: biometric,
        submittedByName,
        createdById: user?.id || user?.userId || null,
      },
      include: {
        truck: { select: { id: true, truckNumber: true } },
        plant: { select: { id: true, name: true } },
        party: { select: { id: true, name: true } },
      },
    });
  }

  private shapeRow(e: any) {
    return {
      id: e.id,
      date: e.date,
      truckId: e.truckId,
      truckNo: e.truck?.truckNumber || '—',
      millName: e.plant?.name || '—',
      plantId: e.plantId,
      slipNo: e.slipNo,
      truckType: e.truckType,
      readingUnit: e.readingUnit,
      oldReading: e.oldReading,
      oldAverage: e.oldAverage,
      newReading: e.newReading,
      totalRun: e.totalRun,
      dieselQty: e.dieselQty,
      average: e.average,
      rate: e.rate,
      amount: e.amount,
      driverName: e.driverName || '—',
      partyName: e.partyName || e.party?.name || '—',
      partyId: e.partyId,
      by: e.submittedByName || '—',
      createdAt: e.createdAt,
    };
  }

  private async queryEntries(filters: {
    truckId?: string;
    partyId?: string;
    from?: string;
    to?: string;
    slipFrom?: number;
    slipTo?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.truckId) where.truckId = filters.truckId;
    if (filters.partyId) where.partyId = filters.partyId;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) {
        const end = new Date(filters.to);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    if (filters.slipFrom != null || filters.slipTo != null) {
      where.slipNo = {};
      if (filters.slipFrom != null) where.slipNo.gte = filters.slipFrom;
      if (filters.slipTo != null) where.slipNo.lte = filters.slipTo;
    }

    const rows = await this.prisma.dieselFuelEntry.findMany({
      where,
      include: {
        truck: { select: { id: true, truckNumber: true } },
        plant: { select: { id: true, name: true } },
        party: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: filters.limit || 500,
    });
    return rows.map((e) => this.shapeRow(e));
  }

  private totals(rows: any[]) {
    const totalRun = this.round3(rows.reduce((s, r) => s + (r.totalRun || 0), 0));
    const totalDiesel = this.round3(rows.reduce((s, r) => s + (r.dieselQty || 0), 0));
    const totalAmount = this.round3(rows.reduce((s, r) => s + (r.amount || 0), 0));
    const totalAverage =
      totalDiesel > 0 ? this.round3(totalRun / totalDiesel) : 0;
    const avgs = rows.map((r) => r.average).filter((a) => a > 0);
    const bestAverage = avgs.length ? Math.max(...avgs) : 0;
    const worstAverage = avgs.length ? Math.min(...avgs) : 0;
    return {
      totalRun,
      totalDiesel,
      totalAmount,
      totalAverage,
      bestAverage: this.round3(bestAverage),
      decliningAverage: this.round3(worstAverage),
      count: rows.length,
    };
  }

  /** Truck Average — default last 10; optional filters */
  async truckAverage(opts: {
    truckId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const limit = opts.truckId || opts.from || opts.to ? opts.limit || 200 : 10;
    const rows = await this.queryEntries({ ...opts, limit });
    return { rows, totals: this.totals(rows) };
  }

  /** Unique parties used in diesel forms */
  async partyList() {
    const groups = await this.prisma.dieselFuelEntry.groupBy({
      by: ['partyId', 'partyName'],
      where: { partyId: { not: null } },
      _count: { _all: true },
      _sum: { amount: true },
    });
    return groups
      .filter((g) => g.partyId)
      .map((g) => ({
        partyId: g.partyId!,
        partyName: g.partyName || '—',
        refillCount: g._count._all,
        totalAmount: this.round3(g._sum.amount || 0),
      }))
      .sort((a, b) => a.partyName.localeCompare(b.partyName));
  }

  async partyWise(opts: {
    partyId: string;
    from?: string;
    to?: string;
    slipFrom?: number;
    slipTo?: number;
  }) {
    if (!opts.partyId) throw new BadRequestException('partyId required');
    const rows = await this.queryEntries(opts);
    return { rows, totals: this.totals(rows) };
  }
}

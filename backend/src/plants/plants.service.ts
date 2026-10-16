import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page?: string, limit?: string) {
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      
      const [total, data] = await this.prisma.$transaction([
        this.prisma.plant.count(),
        this.prisma.plant.findMany({
          orderBy: { name: 'asc' },
          skip,
          take: limitNum
        })
      ]);
      return { data, total };
    }

    return this.prisma.plant.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.plant.create({
      data: {
        name: data.name,
        code: data.code,
        location: data.location,
        standardBagWeight: data.standardBagWeight ? parseFloat(data.standardBagWeight) : 0.382,
        wastageBagWeight: data.wastageBagWeight ? parseFloat(data.wastageBagWeight) : 0.382,
        aClassBagWeight: data.aClassBagWeight ? parseFloat(data.aClassBagWeight) : 0.380,
        bClassBagWeight: data.bClassBagWeight ? parseFloat(data.bClassBagWeight) : 0.385
      },
    });
  }

  async update(id: string, data: any) {
    const numIfPresent = (v: unknown) => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : undefined;
    };

    return this.prisma.plant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code }),
        ...(data.location && { location: data.location }),
        ...(numIfPresent(data.standardBagWeight) !== undefined && {
          standardBagWeight: numIfPresent(data.standardBagWeight),
        }),
        ...(numIfPresent(data.wastageBagWeight) !== undefined && {
          wastageBagWeight: numIfPresent(data.wastageBagWeight),
        }),
        ...(numIfPresent(data.aClassBagWeight) !== undefined && {
          aClassBagWeight: numIfPresent(data.aClassBagWeight),
        }),
        ...(numIfPresent(data.bClassBagWeight) !== undefined && {
          bClassBagWeight: numIfPresent(data.bClassBagWeight),
        }),
        // Allow 0 — truthy checks would skip zeros
        ...(numIfPresent(data.govtRate) !== undefined && { govtRate: numIfPresent(data.govtRate) }),
        ...(numIfPresent(data.benchmarkMoisture) !== undefined && {
          benchmarkMoisture: numIfPresent(data.benchmarkMoisture),
        }),
        ...(numIfPresent(data.safaiCut) !== undefined && { safaiCut: numIfPresent(data.safaiCut) }),
        ...(numIfPresent(data.processingCut) !== undefined && {
          processingCut: numIfPresent(data.processingCut),
        }),
        ...(data.allowManualDateTimePaddyInward !== undefined && {
          allowManualDateTimePaddyInward:
            data.allowManualDateTimePaddyInward === true || data.allowManualDateTimePaddyInward === 'true',
        }),
        ...(data.allowManualDateTimeGateIn !== undefined && {
          allowManualDateTimeGateIn:
            data.allowManualDateTimeGateIn === true || data.allowManualDateTimeGateIn === 'true',
        }),
        ...(data.allowManualDateTimeGateOut !== undefined && {
          allowManualDateTimeGateOut:
            data.allowManualDateTimeGateOut === true || data.allowManualDateTimeGateOut === 'true',
        }),
        ...(data.allowManualDateTimeStackTransfer !== undefined && {
          allowManualDateTimeStackTransfer:
            data.allowManualDateTimeStackTransfer === true ||
            data.allowManualDateTimeStackTransfer === 'true',
        }),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.plant.delete({
      where: { id }
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(plantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batchesToday = await this.prisma.productionBatch.count({
      where: {
        plantId,
        date: {
          gte: today,
        },
      },
    });

    const metricsAgg = await this.prisma.productionBatch.aggregate({
      where: {
        plantId,
        date: {
          gte: today,
        },
      },
      _sum: {
        paddyUsedQty: true,
        riceProducedQty: true,
      },
    });

    const lossAgg = await this.prisma.processLoss.aggregate({
      where: {
        batch: {
          plantId,
          date: { gte: today },
        },
      },
      _sum: {
        totalLoss: true,
      },
    });

    const byProductAgg = await this.prisma.byProduct.aggregate({
      where: {
        batch: {
          plantId,
          date: { gte: today },
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const paddyUsed = metricsAgg._sum.paddyUsedQty || 0;
    const riceProduced = metricsAgg._sum.riceProducedQty || 0;
    const avgYield = paddyUsed > 0 ? (riceProduced / paddyUsed) * 100 : 0;

    return {
      batchesToday,
      totalPaddyUsed: paddyUsed,
      totalRiceProduced: riceProduced,
      avgYield: avgYield.toFixed(2),
      totalProcessLoss: lossAgg._sum.totalLoss || 0,
      totalByProducts: byProductAgg._sum.quantity || 0,
    };
  }

  async getBatches(plantId: string) {
    return this.prisma.productionBatch.findMany({
      where: { plantId },
      orderBy: { date: 'desc' },
      include: {
        processLoss: true,
        byProducts: true,
        yieldReport: true,
      },
    });
  }

  async createBatch(dto: CreateBatchDto) {
    const batch = await this.prisma.productionBatch.create({
      data: {
        plantId: dto.plantId,
        batchNo: dto.batchNo,
        date: new Date(dto.date),
        shift: dto.shift,
        productionLine: dto.productionLine,
        paddyType: dto.paddyType,
        variety: dto.variety,
        paddySource: dto.paddySource,
        paddyUsedQty: dto.paddyUsedQty,
        remarks: dto.remarks,
        status: 'In Progress',
        progress: 0,
      },
    });

    return batch;
  }
}

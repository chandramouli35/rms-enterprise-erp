import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService, private inventoryService: InventoryService) {}

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

  async getBatches(plantId: string, status?: string, dateFrom?: string, dateTo?: string) {
    const where: any = { plantId };
    if (status && status !== 'All') where.status = status;
    if (dateFrom && dateTo) {
      where.date = { gte: new Date(dateFrom), lte: new Date(dateTo) };
    }
    return this.prisma.productionBatch.findMany({
      where,
      orderBy: { date: 'desc' }
    });
  }

  async getBatchDetails(id: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id },
      include: {
        processLoss: true,
        byProducts: true,
        yieldReport: true,
      },
    });
    
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async createBatch(dto: CreateBatchDto) {
    // 1. Create the Batch
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

    // 2. Deduct Paddy from Inventory
    await this.inventoryService.adjustStock({
      plantId: dto.plantId,
      itemType: 'PADDY',
      variety: dto.variety,
      quantityChange: -dto.paddyUsedQty,
      transactionType: 'OUT', // Issued for production
      referenceId: batch.id,
      remarks: `Issued to production batch ${batch.batchNo}`,
      shift: dto.shift
    });

    return batch;
  }

  async completeBatch(batchId: string, data: any) {
    const { riceProducedQty, byProducts, processLoss, yieldReport } = data;
    
    const batch = await this.prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status === 'Completed') throw new BadRequestException('Batch is already completed');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Batch
      const updatedBatch = await tx.productionBatch.update({
        where: { id: batchId },
        data: {
          riceProducedQty,
          status: 'Completed',
          progress: 100,
          endTime: new Date()
        }
      });

      // 2. Save Process Loss
      if (processLoss) {
        await tx.processLoss.create({
          data: {
            productionBatchId: batchId,
            ...processLoss
          }
        });
      }

      // 3. Save ByProducts
      if (byProducts && byProducts.length > 0) {
        await tx.byProduct.createMany({
          data: byProducts.map(bp => ({
            productionBatchId: batchId,
            name: bp.name,
            quantity: bp.quantity,
            utilization: bp.utilization
          }))
        });
      }

      // 4. Save Yield Report
      if (yieldReport) {
        await tx.yieldReport.create({
          data: {
            productionBatchId: batchId,
            plantId: batch.plantId,
            ...yieldReport
          }
        });
      }

      // 5. Add Rice to Inventory
      await this.inventoryService.adjustStock({
        plantId: batch.plantId,
        itemType: 'RICE',
        variety: batch.variety,
        quantityChange: riceProducedQty,
        transactionType: 'IN', // Produced
        referenceId: batch.id,
        remarks: `Produced from batch ${batch.batchNo}`,
        shift: batch.shift
      });

      // 6. Add ByProducts to Inventory
      if (byProducts && byProducts.length > 0) {
        for (const bp of byProducts) {
          // Map ByProduct names to ItemType
          let itemType = 'BY_PRODUCT';
          if (bp.name.toUpperCase().includes('BRAN')) itemType = 'BRAN';
          else if (bp.name.toUpperCase().includes('HUSK')) itemType = 'HUSK';

          await this.inventoryService.adjustStock({
            plantId: batch.plantId,
            itemType: itemType,
            variety: batch.variety,
            quantityChange: bp.quantity,
            transactionType: 'IN',
            referenceId: batch.id,
            remarks: `By-Product from batch ${batch.batchNo}`,
            shift: batch.shift
          });
        }
      }

      return updatedBatch;
    });
  }
}

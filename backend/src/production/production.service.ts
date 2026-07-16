import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService, private inventoryService: InventoryService) {}

  async getMetrics(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeBatches = await this.prisma.productionBatch.count({
      where: {
        ...whereClause,
        status: 'IN_PROGRESS'
      }
    });

    const batchesToday = await this.prisma.productionBatch.count({
      where: {
        ...whereClause,
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

  async getBatches(plantId: string, status?: string, dateFrom?: string, dateTo?: string, role?: string) {
    const where: any = plantId === 'global' ? {} : { plantId };
    if (status && status !== 'All') where.status = status;
    
    let fromDate;
    let toDate;

    if (dateFrom && dateTo) {
      fromDate = new Date(dateFrom);
      toDate = new Date(dateTo);
    }

    // Restriction for Supervisor: Only "One Day Previous Data"
    if (role === 'Supervisor') {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 2); // Show up to yesterday
      
      if (!fromDate || fromDate < oneDayAgo) {
        fromDate = oneDayAgo;
      }
    }

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = fromDate;
      if (toDate) where.date.lte = toDate;
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
        rBranBags: dto.additionalOutputs?.['R. Bran']?.produced || 0,
        kPhuckBags: dto.additionalOutputs?.['K. Phuck']?.produced || 0,
        brokenRiceBags: dto.additionalOutputs?.['Broken Rice']?.produced || 0,
        nakku1Bags: dto.additionalOutputs?.['Nakku 1']?.produced || 0,
        nakku2Bags: dto.additionalOutputs?.['Nakku 2']?.produced || 0,
        rejectionBags: dto.additionalOutputs?.['Rejection']?.produced || 0,
        finalRiceBags: dto.additionalOutputs?.['Final Rice']?.produced || 0,
        mansooriBags: dto.additionalOutputs?.['Mansoori']?.produced || 0,
        wandBags: dto.additionalOutputs?.['Wand']?.produced || 0,
        parmalBags: dto.additionalOutputs?.['Parmal']?.produced || 0,
        frkBags: dto.additionalOutputs?.['FRK']?.produced || 0,
        rBranReused: dto.additionalOutputs?.['R. Bran']?.reused || 0,
        kPhuckReused: dto.additionalOutputs?.['K. Phuck']?.reused || 0,
        brokenRiceReused: dto.additionalOutputs?.['Broken Rice']?.reused || 0,
        nakku1Reused: dto.additionalOutputs?.['Nakku 1']?.reused || 0,
        nakku2Reused: dto.additionalOutputs?.['Nakku 2']?.reused || 0,
        rejectionReused: dto.additionalOutputs?.['Rejection']?.reused || 0,
        finalRiceReused: dto.additionalOutputs?.['Final Rice']?.reused || 0,
        mansooriReused: dto.additionalOutputs?.['Mansoori']?.reused || 0,
        wandReused: dto.additionalOutputs?.['Wand']?.reused || 0,
        parmalReused: dto.additionalOutputs?.['Parmal']?.reused || 0,
        frkReused: dto.additionalOutputs?.['FRK']?.reused || 0,
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
      transactionType: 'OUT',
      referenceId: batch.id,
      remarks: `Issued to production batch ${batch.batchNo}`,
      shift: dto.shift
    });

    // 3. Sync Additional Outputs (By-Products) to Inventory
    if (dto.additionalOutputs) {
      for (const [itemName, data] of Object.entries(dto.additionalOutputs)) {
        const produced = Number(data.produced) || 0;
        const reused = Number(data.reused) || 0;
        const netQuantity = produced - reused;

        // Validation happens in frontend, but backend can also check if reused > produced + currentStock
        // For now we sync the net change to inventory
        if (netQuantity !== 0) {
          await this.inventoryService.adjustStock({
            plantId: dto.plantId,
            itemType: 'BYPRODUCT',
            variety: itemName,
            quantityChange: netQuantity,
            transactionType: netQuantity > 0 ? 'IN' : 'OUT',
            referenceId: batch.id,
            remarks: `Net yield (Produced: ${produced}, Reused: ${reused}) from batch ${batch.batchNo}`,
            shift: dto.shift
          });
        }
      }
    }

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

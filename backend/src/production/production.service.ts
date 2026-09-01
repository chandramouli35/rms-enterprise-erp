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

  async getBatches(plantId: string, status?: string, dateFrom?: string, dateTo?: string, role?: string, page?: string, limit?: string) {
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

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.productionBatch.count({ where }),
      this.prisma.productionBatch.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    return { data, total };
  }

  async getBatchDetails(id: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id },
      include: {
        processLoss: true,
        byProducts: true,
        yieldReport: true,
        batchAnalysis: true,
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
        moisture: dto.moisture,
        rBranBags: dto.additionalOutputs?.['R. Bran']?.produced || 0,
        kPhuckBags: dto.additionalOutputs?.['K. Phuck']?.produced || 0,
        brokenRiceBags: dto.additionalOutputs?.['Broken Rice']?.produced || 0,
        nakku1Bags: dto.additionalOutputs?.['Nakku 1']?.produced || 0,
        nakku2Bags: dto.additionalOutputs?.['Nakku 2']?.produced || 0,
        rejectionBags: dto.additionalOutputs?.['Rejection']?.produced || 0,
        finalRiceBags: dto.additionalOutputs?.['Final Rice']?.produced || 0,
        mansooriBags: dto.additionalOutputs?.['Mansoori']?.produced || 0,
        wandProducedBags: dto.additionalOutputs?.['Wand']?.wandProduced || 0,
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
        paddyDryingTargetStack: dto.paddyDryingTargetStack,
        stackInputs: {
          create: dto.stackInputs?.map(s => ({
            stackNo: s.stackNo,
            bags: s.isDirectUnload ? null : Number(s.bags),
            isDirectUnload: s.isDirectUnload
          })) || []
        }
      },
    });

    // Special handling for "Dry Paddy" since it goes to ByProducts explicitly with targetStack and moisture
    if (dto.additionalOutputs?.['Dry Paddy']) {
      const dryPaddy = dto.additionalOutputs['Dry Paddy'];
      if (dryPaddy.produced > 0 || dryPaddy.reused > 0) {
         await this.prisma.byProduct.create({
           data: {
             productionBatchId: batch.id,
             name: 'Dry Paddy',
             quantity: dryPaddy.produced, // assuming bags/MT conversion is handled elsewhere or quantity is bags
             moisture: dryPaddy.moisture,
             targetStack: dryPaddy.targetStack,
             remarks: 'Reused: ' + dryPaddy.reused
           }
         });
      }
    }

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

  async getDailyStockReport(plantId: string, dateStr: string) {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const whereClause = plantId === 'global' ? {} : { plantId };

    // 1. Get all transactions up to targetDate for Opening Balances
    const pastLedgers = await this.prisma.stockLedger.findMany({
      where: {
        ...whereClause,
        createdAt: { lt: targetDate }
      }
    });

    const opBal: Record<string, number> = {};
    pastLedgers.forEach(l => {
      const type = l.itemType.toUpperCase();
      if (!opBal[type]) opBal[type] = 0;
      if (l.transaction === 'IN') opBal[type] += l.quantity;
      if (l.transaction === 'OUT') opBal[type] -= l.quantity;
    });

    // 2. Get today's transactions
    const todayLedgers = await this.prisma.stockLedger.findMany({
      where: {
        ...whereClause,
        createdAt: { gte: targetDate, lt: nextDate }
      }
    });

    let totalPaddyDay = 0;
    let totalPaddyNight = 0;

    todayLedgers.forEach(l => {
      if (l.itemType.toUpperCase() === 'PADDY' && l.transaction === 'OUT') {
         let isDay = l.shift === 'Day';
         if (!l.shift) {
           const hour = l.createdAt.getHours();
           isDay = hour >= 8 && hour < 20;
         }
         if (isDay) totalPaddyDay += l.quantity;
         else totalPaddyNight += l.quantity;
      }
    });

    const reportMap: Record<string, any> = {};

    todayLedgers.forEach(l => {
      const type = l.itemType.toUpperCase();
      if (!reportMap[type]) {
        reportMap[type] = {
          item: type,
          opBal: opBal[type] || 0,
          inDay: 0,
          inNight: 0,
          outDay: 0,
          outNight: 0,
        };
      }
      
      let isDay = l.shift === 'Day';
      if (!l.shift) {
        const hour = l.createdAt.getHours();
        isDay = hour >= 8 && hour < 20;
      }

      if (l.transaction === 'IN') {
         if (isDay) reportMap[type].inDay += l.quantity;
         else reportMap[type].inNight += l.quantity;
      } else if (l.transaction === 'OUT') {
         if (isDay) reportMap[type].outDay += l.quantity;
         else reportMap[type].outNight += l.quantity;
      }
    });

    Object.keys(opBal).forEach(type => {
      if (!reportMap[type] && opBal[type] !== 0) {
        reportMap[type] = {
          item: type,
          opBal: opBal[type],
          inDay: 0, inNight: 0, outDay: 0, outNight: 0
        };
      }
    });

    const reportData = Object.values(reportMap).map((row: any) => {
      const inTotal = row.inDay + row.inNight;
      const outTotal = row.outDay + row.outNight;
      const closingBal = row.opBal + inTotal - outTotal;
      
      const dayPercent = totalPaddyDay > 0 ? (row.inDay / totalPaddyDay) * 100 : 0;
      const nightPercent = totalPaddyNight > 0 ? (row.inNight / totalPaddyNight) * 100 : 0;

      return {
        ...row,
        dayPercent: parseFloat(dayPercent.toFixed(2)),
        nightPercent: parseFloat(nightPercent.toFixed(2)),
        inTotal,
        outTotal,
        balance: closingBal
      };
    });

    return reportData;
  }

  async getShiftWiseStockReport(plantId: string, dateStr: string) {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const whereClause = plantId === 'global' ? {} : { plantId };

    // 1. Get Opening Balances
    const pastLedgers = await this.prisma.stockLedger.findMany({
      where: {
        ...whereClause,
        createdAt: { lt: targetDate }
      }
    });

    const opBal: Record<string, number> = {};
    pastLedgers.forEach(l => {
      const type = l.itemType.toUpperCase();
      if (!opBal[type]) opBal[type] = 0;
      if (l.transaction === 'IN') opBal[type] += l.quantity;
      if (l.transaction === 'OUT') opBal[type] -= l.quantity;
    });

    // 2. Get today's transactions
    const todayLedgers = await this.prisma.stockLedger.findMany({
      where: {
        ...whereClause,
        createdAt: { gte: targetDate, lt: nextDate }
      }
    });

    const reportMap: Record<string, any> = {};

    todayLedgers.forEach(l => {
      const type = l.itemType.toUpperCase();
      if (!reportMap[type]) {
        reportMap[type] = {
          item: type,
          opBal: opBal[type] || 0,
          prodInDay: 0, prodInNight: 0,
          gpInDay: 0, gpInNight: 0,
          usageOutDay: 0, usageOutNight: 0,
          gpOutDay: 0, gpOutNight: 0,
        };
      }
      
      let isDay = l.shift === 'Day';
      if (!l.shift) {
        const hour = l.createdAt.getHours();
        isDay = hour >= 8 && hour < 20;
      }

      const remarks = (l.remarks || '').toLowerCase();
      const isProduction = remarks.includes('produced') || remarks.includes('by-product') || remarks.includes('issued to production');
      
      if (l.transaction === 'IN') {
         if (isProduction) {
           if (isDay) reportMap[type].prodInDay += l.quantity;
           else reportMap[type].prodInNight += l.quantity;
         } else {
           if (isDay) reportMap[type].gpInDay += l.quantity;
           else reportMap[type].gpInNight += l.quantity;
         }
      } else if (l.transaction === 'OUT') {
         if (isProduction) {
           if (isDay) reportMap[type].usageOutDay += l.quantity;
           else reportMap[type].usageOutNight += l.quantity;
         } else {
           if (isDay) reportMap[type].gpOutDay += l.quantity;
           else reportMap[type].gpOutNight += l.quantity;
         }
      }
    });

    Object.keys(opBal).forEach(type => {
      if (!reportMap[type] && opBal[type] !== 0) {
        reportMap[type] = {
          item: type,
          opBal: opBal[type],
          prodInDay: 0, prodInNight: 0,
          gpInDay: 0, gpInNight: 0,
          usageOutDay: 0, usageOutNight: 0,
          gpOutDay: 0, gpOutNight: 0,
        };
      }
    });

    const reportData = Object.values(reportMap).map((row: any) => {
      const prodInTotal = row.prodInDay + row.prodInNight;
      const gpInTotal = row.gpInDay + row.gpInNight;
      const usageOutTotal = row.usageOutDay + row.usageOutNight;
      const gpOutTotal = row.gpOutDay + row.gpOutNight;
      const closingBal = row.opBal + prodInTotal + gpInTotal - usageOutTotal - gpOutTotal;
      // Add mock bag conversion based on standard 50kg bags (adjust as needed)
      const bags = Math.floor(closingBal / 50);

      return {
        ...row,
        prodInTotal,
        gpInTotal,
        usageOutTotal,
        gpOutTotal,
        balance: closingBal,
        bags,
        netRiceProd: row.item.includes('RICE') ? (prodInTotal - usageOutTotal) : null
      };
    });

    // Calculate Summary Metrics
    const riceRow = reportData.find(r => r.item.includes('RICE')) || { 
      prodInDay: 0, usageOutDay: 0, 
      prodInNight: 0, usageOutNight: 0,
      gpOutTotal: 0
    };

    const finalRiceDay = riceRow.prodInDay;
    const totalRiceInputDay = riceRow.usageOutDay;
    const netRiceProductionDay = finalRiceDay - totalRiceInputDay;

    const finalRiceNight = riceRow.prodInNight;
    const totalRiceInputNight = riceRow.usageOutNight;
    const netRiceProductionNight = finalRiceNight - totalRiceInputNight;

    // For Rice Wagons Delivered, we look at all past 'OUT' transactions for RICE via GP
    let pastRiceWagons = 0;
    pastLedgers.forEach(l => {
      if (l.itemType.toUpperCase().includes('RICE') && l.transaction === 'OUT') {
         const remarks = (l.remarks || '').toLowerCase();
         if (!remarks.includes('issued to production')) {
           pastRiceWagons += l.quantity; // Assuming quantity maps to delivery units/kgs
         }
      }
    });

    const riceWagonDelivered = pastRiceWagons;
    const todayDelivery = riceRow.gpOutTotal;
    const totalRiceWagonsDelivered = riceWagonDelivered + todayDelivery;

    return {
      reportData,
      summary: {
        finalRiceDay,
        totalRiceInputDay,
        netRiceProductionDay,
        finalRiceNight,
        totalRiceInputNight,
        netRiceProductionNight,
        riceWagonDelivered,
        todayDelivery,
        totalRiceWagonsDelivered
      }
    };
  }

  async saveBatchAnalysis(batchId: string, data: any) {
    const {
      paddyMoisture, khanjanBroken, polisher1, polisher2, polisher3, polisher4, 
      difference1To4, pamalaBroken, finalBroken, riceMoisture, 
      damagePercent, discolourPercent, frkPercent
    } = data;

    const existing = await this.prisma.batchAnalysis.findUnique({
      where: { productionBatchId: batchId }
    });

    if (existing) {
      return this.prisma.batchAnalysis.update({
        where: { productionBatchId: batchId },
        data: {
          paddyMoisture: paddyMoisture ? Number(paddyMoisture) : null,
          khanjanBroken: khanjanBroken ? Number(khanjanBroken) : null,
          polisher1: polisher1 ? Number(polisher1) : null,
          polisher2: polisher2 ? Number(polisher2) : null,
          polisher3: polisher3 ? Number(polisher3) : null,
          polisher4: polisher4 ? Number(polisher4) : null,
          difference1To4: difference1To4 ? Number(difference1To4) : null,
          pamalaBroken: pamalaBroken ? Number(pamalaBroken) : null,
          finalBroken: finalBroken ? Number(finalBroken) : null,
          riceMoisture: riceMoisture ? Number(riceMoisture) : null,
          damagePercent: damagePercent ? Number(damagePercent) : null,
          discolourPercent: discolourPercent ? Number(discolourPercent) : null,
          frkPercent: frkPercent ? Number(frkPercent) : null,
        }
      });
    } else {
      return this.prisma.batchAnalysis.create({
        data: {
          productionBatchId: batchId,
          paddyMoisture: paddyMoisture ? Number(paddyMoisture) : null,
          khanjanBroken: khanjanBroken ? Number(khanjanBroken) : null,
          polisher1: polisher1 ? Number(polisher1) : null,
          polisher2: polisher2 ? Number(polisher2) : null,
          polisher3: polisher3 ? Number(polisher3) : null,
          polisher4: polisher4 ? Number(polisher4) : null,
          difference1To4: difference1To4 ? Number(difference1To4) : null,
          pamalaBroken: pamalaBroken ? Number(pamalaBroken) : null,
          finalBroken: finalBroken ? Number(finalBroken) : null,
          riceMoisture: riceMoisture ? Number(riceMoisture) : null,
          damagePercent: damagePercent ? Number(damagePercent) : null,
          discolourPercent: discolourPercent ? Number(discolourPercent) : null,
          frkPercent: frkPercent ? Number(frkPercent) : null,
        }
      });
    }
  }
}

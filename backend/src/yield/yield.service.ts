import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class YieldService {
  constructor(private prisma: PrismaService) {}

  async saveCalculatorData(plantId: string, data: any) {
    if (!data.batchNo) {
      return { success: false, message: 'Batch number is required to save yield report' };
    }

    const batch = await this.prisma.productionBatch.findUnique({
      where: { batchNo: data.batchNo }
    });

    if (!batch) {
      return { success: false, message: 'Batch not found' };
    }

    // Update batch with rice produced
    await this.prisma.productionBatch.update({
      where: { id: batch.id },
      data: {
        riceProducedQty: data.riceProduced || 0,
        status: 'Completed',
        progress: 100
      }
    });

    // Upsert yield report
    const yieldReport = await this.prisma.yieldReport.upsert({
      where: { productionBatchId: batch.id },
      create: {
        productionBatchId: batch.id,
        plantId: plantId,
        headRicePercent: data.headRicePercent || 0,
        brokenRicePercent: data.brokenRicePercent || 0,
        branPercent: data.branPercent || 0,
        huskPercent: data.huskPercent || 0,
        lossPercent: data.lossPercent || 0,
        overallRecovery: data.overallRecovery || 0,
        yieldTarget: 67, // default target
        targetAchieved: (data.overallRecovery || 0) >= 67
      },
      update: {
        headRicePercent: data.headRicePercent || 0,
        brokenRicePercent: data.brokenRicePercent || 0,
        branPercent: data.branPercent || 0,
        huskPercent: data.huskPercent || 0,
        lossPercent: data.lossPercent || 0,
        overallRecovery: data.overallRecovery || 0,
        targetAchieved: (data.overallRecovery || 0) >= 67
      }
    });

    return { success: true, data: yieldReport };
  }

  async getAnalytics(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };
    const yieldReports = await this.prisma.yieldReport.findMany({
      where: whereClause,
      include: { batch: true, plant: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!yieldReports.length) {
      return { 
        bestPlant: '-', 
        highestYield: 0, 
        lowestYield: 0, 
        averageYield: 0, 
        predictedYield: 0, 
        latestBatch: null,
        batchStart: null,
        batchEnd: null,
        batchPaddy: 0,
        batchRice: 0,
        batchByProducts: 0,
        batchLoss: 0,
        batchRecovery: 0,
        batchTarget: 0,
        batchAchievement: 0,
        chartData: [] 
      };
    }

    let sum = 0;
    let highest = 0;
    let lowest = 100;
    
    yieldReports.forEach(r => {
      if (r.overallRecovery > highest) highest = r.overallRecovery;
      if (r.overallRecovery < lowest) lowest = r.overallRecovery;
      sum += r.overallRecovery;
    });

    const averageYield = (sum / yieldReports.length).toFixed(2);
    const latest = yieldReports[0];

    return {
      bestPlant: latest.plant.name,
      highestYield: highest.toFixed(2),
      lowestYield: lowest.toFixed(2),
      averageYield,
      predictedYield: averageYield, // Mock AI prediction as average
      
      // Batch Summary mapping
      latestBatch: latest.batch.batchNo,
      batchStart: latest.batch.date?.toLocaleString() || '-',
      batchEnd: '-',
      batchPaddy: latest.batch.paddyUsedQty.toFixed(3),
      batchRice: latest.batch.riceProducedQty?.toFixed(3) || '0.000',
      batchByProducts: (
        (latest.branPercent + latest.huskPercent) / 100 * latest.batch.paddyUsedQty
      ).toFixed(3),
      batchLoss: (latest.lossPercent / 100 * latest.batch.paddyUsedQty).toFixed(3),
      batchRecovery: latest.overallRecovery.toFixed(2),
      batchTarget: latest.yieldTarget?.toFixed(2) || '65.00',
      batchAchievement: latest.yieldTarget 
        ? ((latest.overallRecovery / latest.yieldTarget) * 100).toFixed(2) 
        : '100.00',

      chartData: yieldReports.map(r => ({
        name: r.batch.batchNo,
        yield: r.overallRecovery,
        date: r.createdAt
      })).reverse().slice(0, 12)
    };
  }

  async getHistorical(plantId: string, dateFrom?: string, dateTo?: string, variety?: string) {
    const where: any = plantId === 'global' ? {} : { plantId };
    if (dateFrom && dateTo) {
      where.createdAt = { gte: new Date(dateFrom), lte: new Date(dateTo) };
    }
    if (variety && variety !== 'All Varieties' && variety !== '') {
      where.batch = { variety };
    }

    return this.prisma.yieldReport.findMany({
      where,
      include: { batch: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { CreateProcessLossDto } from './dto/create-process-loss.dto';
import { MillingStatus, TransactionType } from '@prisma/client';
import { YieldCalculator } from './yield.calculator';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService
  ) {}

  async createBatch(dto: CreateBatchDto) {
    const existing = await this.prisma.batch.findUnique({
      where: { batchNumber: dto.batchNumber }
    });
    if (existing) {
      throw new BadRequestException(`Batch number ${dto.batchNumber} already exists`);
    }

    // Check inventory before doing anything to prevent dangling batches
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        plantId_itemType: {
          plantId: dto.plantId,
          itemType: 'PADDY',
        },
      },
    });

    if (!inventoryItem || inventoryItem.quantity < dto.rawMaterialQty) {
      throw new BadRequestException(`Insufficient stock for PADDY. Current: ${inventoryItem?.quantity || 0} MT`);
    }

    // 1. Create the Batch
    const batch = await this.prisma.batch.create({
      data: {
        batchNumber: dto.batchNumber,
        plantId: dto.plantId,
        rawMaterialQty: dto.rawMaterialQty,
        status: MillingStatus.PENDING,
      },
    });

    // 2. Deduct from Raw Material Inventory (PADDY)
    try {
      await this.inventoryService.processTransaction({
        plantId: dto.plantId,
        itemType: 'PADDY',
        itemCategory: 'RAW_MATERIAL',
        quantity: -dto.rawMaterialQty,
        transactionType: TransactionType.OUT,
        referenceId: batch.id,
        remarks: `Issued to Batch ${dto.batchNumber}`,
      });
    } catch (error) {
      // Compensating action if inventory deduction fails for some reason
      await this.prisma.batch.delete({ where: { id: batch.id } });
      throw error;
    }

    return batch;
  }

  async startMilling(batchId: string) {
    const batch = await this.prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status !== MillingStatus.PENDING) {
      throw new BadRequestException('Batch is already running or completed');
    }

    const milling = await this.prisma.millingProcess.create({
      data: {
        batchId: batch.id,
        status: MillingStatus.RUNNING,
        startTime: new Date(),
      },
    });

    await this.prisma.batch.update({
      where: { id: batchId },
      data: { status: MillingStatus.RUNNING },
    });

    return milling;
  }

  async stopMilling(batchId: string) {
    const batch = await this.prisma.batch.findUnique({ 
      where: { id: batchId },
      include: { millingProcess: true } 
    });
    if (!batch || !batch.millingProcess) throw new NotFoundException('Running process not found');

    await this.prisma.millingProcess.update({
      where: { id: batch.millingProcess.id },
      data: {
        status: MillingStatus.COMPLETED,
        endTime: new Date(),
      },
    });

    return this.prisma.batch.update({
      where: { id: batchId },
      data: { status: MillingStatus.COMPLETED },
    });
  }

  async addProductionLog(millingProcessId: string, dto: CreateProductionLogDto) {
    const process = await this.prisma.millingProcess.findUnique({
      where: { id: millingProcessId },
      include: { batch: true, productionLogs: true },
    });
    if (!process) throw new NotFoundException('Milling process not found');

    const totalProduced = process.productionLogs.reduce((sum, log) => sum + log.quantity, 0);
    const newTotal = totalProduced + dto.quantity;
    
    if (newTotal > process.batch.rawMaterialQty) {
      throw new BadRequestException(`Cannot log ${dto.quantity} MT. Only ${(process.batch.rawMaterialQty - totalProduced).toFixed(3)} MT remaining from original ${process.batch.rawMaterialQty} MT batch.`);
    }

    // 1. Create Log
    const log = await this.prisma.productionLog.create({
      data: {
        millingProcessId: process.id,
        itemType: dto.itemType,
        quantity: dto.quantity,
        shift: dto.shift,
      },
    });

    // 2. Add to Finished Goods Inventory
    await this.inventoryService.processTransaction({
      plantId: process.batch.plantId,
      itemType: dto.itemType,
      itemCategory: 'FINISHED_GOOD',
      quantity: dto.quantity,
      transactionType: TransactionType.IN,
      referenceId: process.batch.id,
      remarks: `Produced from Batch ${process.batch.batchNumber}`,
    });

    return log;
  }

  async addProcessLoss(millingProcessId: string, dto: CreateProcessLossDto) {
    return this.prisma.processLoss.create({
      data: {
        millingProcessId,
        lossType: dto.lossType,
        quantity: dto.quantity,
      },
    });
  }

  async getBatchYield(batchId: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        millingProcess: {
          include: {
            productionLogs: true,
            processLosses: true,
          }
        }
      }
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const logs = batch.millingProcess?.productionLogs || [];
    const losses = batch.millingProcess?.processLosses || [];

    const totalProduced = logs.reduce((acc, log) => acc + log.quantity, 0);
    const totalLoss = losses.reduce((acc, loss) => acc + loss.quantity, 0);

    return {
      batchNumber: batch.batchNumber,
      rawMaterialQty: batch.rawMaterialQty,
      totalProduced,
      totalLoss,
      yieldPercentage: YieldCalculator.calculateYield(batch.rawMaterialQty, totalProduced),
      lossPercentage: YieldCalculator.calculateProcessLossPercentage(batch.rawMaterialQty, totalLoss),
      productionLogs: logs,
      processLosses: losses
    };
  }

  async findAllBatches(plantId: string) {
    return this.prisma.batch.findMany({
      where: { plantId },
      include: { 
        millingProcess: {
          include: {
            productionLogs: true,
          }
        } 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlantYieldAnalytics(plantId: string) {
    // Get all completed batches for the plant
    const batches = await this.prisma.batch.findMany({
      where: { 
        plantId,
        status: MillingStatus.COMPLETED
      },
      include: {
        millingProcess: {
          include: {
            productionLogs: true,
            processLosses: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate Yield Trend
    const yieldData = batches.map(batch => {
      const logs = batch.millingProcess?.productionLogs || [];
      const totalProduced = logs.reduce((acc, log) => acc + log.quantity, 0);
      return {
        name: batch.batchNumber,
        raw: batch.rawMaterialQty,
        produced: totalProduced,
        yield: YieldCalculator.calculateYield(batch.rawMaterialQty, totalProduced)
      };
    });

    // Calculate Process Loss Breakdown
    const lossAggregates: Record<string, number> = {};
    batches.forEach(batch => {
      const losses = batch.millingProcess?.processLosses || [];
      losses.forEach(loss => {
        lossAggregates[loss.lossType] = (lossAggregates[loss.lossType] || 0) + loss.quantity;
      });
    });

    const lossData = Object.keys(lossAggregates).map(type => ({
      name: type,
      value: lossAggregates[type]
    }));

    return { yieldData, lossData };
  }
}

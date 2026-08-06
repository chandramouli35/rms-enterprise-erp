import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, UpdateTransferStatusDto } from './dto/create-transfer.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class TransferService {
  constructor(private prisma: PrismaService, private inventoryService: InventoryService) {}

  async getMetrics(plantId?: string) {
    const where = plantId ? { OR: [{ fromPlantId: plantId }, { toPlantId: plantId }] } : {};

    const transfers = await this.prisma.interPlantTransfer.findMany({ where });

    let total = transfers.length;
    let approved = 0;
    let approvedValue = 0;
    let inTransit = 0;
    let inTransitValue = 0;
    let delivered = 0;
    let deliveredValue = 0;
    let cancelled = 0;
    let cancelledValue = 0;

    let inTransitQuantity = 0;
    let delayedTransfers = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const t of transfers) {
      if (t.status === 'Approved') {
        approved++;
        approvedValue += t.estimatedValue || 0;
      } else if (t.status === 'In Transit' || t.status === 'Dispatched') {
        inTransit++;
        inTransitValue += t.estimatedValue || 0;
        inTransitQuantity += t.quantity || 0;

        // Check if delayed
        if (t.expectedDelivery && new Date(t.expectedDelivery) < today) {
          delayedTransfers++;
        }
      } else if (t.status === 'Delivered' || t.status === 'Completed') {
        delivered++;
        deliveredValue += t.estimatedValue || 0;
      } else if (t.status === 'Cancelled') {
        cancelled++;
        cancelledValue += t.estimatedValue || 0;
      }
    }

    return {
      total,
      approved,
      approvedValue,
      inTransit,
      inTransitValue,
      delivered,
      deliveredValue,
      cancelled,
      cancelledValue,
      inTransitQuantity,
      delayedTransfers,
    };
  }

  async getAllTransfers(plantId?: string, status?: string, dateFrom?: string, dateTo?: string, page?: string, limit?: string) {
    const where: any = plantId ? { OR: [{ fromPlantId: plantId }, { toPlantId: plantId }] } : {};
    
    if (status && status !== 'All') {
      const statuses = status.split(',');
      if (statuses.length > 1) {
        where.status = { in: statuses };
      } else {
        where.status = status;
      }
    }
    if (dateFrom && dateTo) {
      where.date = { gte: new Date(dateFrom), lte: new Date(dateTo) };
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.interPlantTransfer.count({ where }),
      this.prisma.interPlantTransfer.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    return { data, total };
  }

  async createTransfer(dto: CreateTransferDto) {
    // Generate request number
    const count = await this.prisma.interPlantTransfer.count();
    const reqNo = `TRF-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

    return this.prisma.interPlantTransfer.create({
      data: {
        requestNo: reqNo,
        fromPlantId: dto.fromPlantId,
        toPlantId: dto.toPlantId,
        date: new Date(dto.date),
        item: dto.item,
        variety: dto.variety,
        quantity: dto.quantity,
        estimatedValue: dto.estimatedValue,
        expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
        vehicleNo: dto.vehicleNo,
        driverName: dto.driverName,
        remarks: dto.remarks,
        status: 'Approved', // Initial status
      },
    });
  }

  async updateStatus(id: string, dto: UpdateTransferStatusDto) {
    const transfer = await this.prisma.interPlantTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    
    // Prevent double processing
    if (transfer.status === dto.status) return transfer;

    const updateData: any = { status: dto.status };

    if (dto.status === 'Dispatched' || dto.status === 'In Transit') {
      updateData.dispatchedOn = new Date();
      
      // Only deduct if transitioning from Approved to Dispatched (prevent multiple deductions)
      if (transfer.status === 'Approved') {
        let itemType = 'FINISHED_GOODS';
        if (transfer.item.toUpperCase().includes('RICE')) itemType = 'RICE';
        else if (transfer.item.toUpperCase().includes('PADDY')) itemType = 'PADDY';
        else if (transfer.item.toUpperCase().includes('BRAN')) itemType = 'BRAN';

        await this.inventoryService.adjustStock({
          plantId: transfer.fromPlantId,
          itemType: itemType,
          variety: transfer.variety || transfer.item,
          quantityChange: -transfer.quantity,
          transactionType: 'TRANSFER',
          referenceId: transfer.id,
          remarks: `Transferred out via request ${transfer.requestNo}`
        });
      }
    } else if (dto.status === 'Delivered' || dto.status === 'Completed') {
      updateData.receivedOn = new Date();
      
      // Only add if transitioning to Delivered from a valid previous state
      if (transfer.status !== 'Delivered' && transfer.status !== 'Completed') {
        let itemType = 'FINISHED_GOODS';
        if (transfer.item.toUpperCase().includes('RICE')) itemType = 'RICE';
        else if (transfer.item.toUpperCase().includes('PADDY')) itemType = 'PADDY';
        else if (transfer.item.toUpperCase().includes('BRAN')) itemType = 'BRAN';

        await this.inventoryService.adjustStock({
          plantId: transfer.toPlantId,
          itemType: itemType,
          variety: transfer.variety || transfer.item,
          quantityChange: transfer.quantity,
          transactionType: 'IN',
          referenceId: transfer.id,
          remarks: `Received transfer request ${transfer.requestNo}`
        });
      }
    }

    return this.prisma.interPlantTransfer.update({
      where: { id },
      data: updateData,
    });
  }
}

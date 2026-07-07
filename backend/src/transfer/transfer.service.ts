import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto, UpdateTransferStatusDto } from './dto/create-transfer.dto';

@Injectable()
export class TransferService {
  constructor(private prisma: PrismaService) {}

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

  async getAllTransfers(plantId?: string) {
    const where = plantId ? { OR: [{ fromPlantId: plantId }, { toPlantId: plantId }] } : {};
    
    return this.prisma.interPlantTransfer.findMany({
      where,
      orderBy: { date: 'desc' },
    });
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

    const updateData: any = { status: dto.status };

    if (dto.status === 'Dispatched' || dto.status === 'In Transit') {
      updateData.dispatchedOn = new Date();
    } else if (dto.status === 'Delivered' || dto.status === 'Completed') {
      updateData.receivedOn = new Date();
    }

    return this.prisma.interPlantTransfer.update({
      where: { id },
      data: updateData,
    });
  }
}

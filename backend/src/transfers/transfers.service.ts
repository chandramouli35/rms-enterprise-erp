import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { TransferStatus, TransactionType, ItemCategory } from '@prisma/client';

export class CreateTransferDto {
  sourcePlantId: string;
  targetPlantId: string;
  itemType: string;
  itemCategory: ItemCategory;
  quantity: number;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService
  ) {}

  async initiateTransfer(dto: CreateTransferDto, userId: string) {
    if (dto.sourcePlantId === dto.targetPlantId) {
      throw new BadRequestException('Source and Target plants must be different.');
    }

    // 1. Check if source plant has enough stock
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        plantId_itemType: {
          plantId: dto.sourcePlantId,
          itemType: dto.itemType,
        }
      }
    });

    if (!inventoryItem || inventoryItem.quantity < dto.quantity) {
      throw new BadRequestException(`Insufficient stock at source plant. Available: ${inventoryItem?.quantity || 0}`);
    }

    // 2. Create Transfer Record
    const transfer = await this.prisma.plantTransfer.create({
      data: {
        sourcePlantId: dto.sourcePlantId,
        targetPlantId: dto.targetPlantId,
        itemType: dto.itemType,
        quantity: dto.quantity,
        status: TransferStatus.IN_TRANSIT,
        initiatedBy: userId,
      }
    });

    // 3. Deduct from Source Plant via Atomic Transaction
    await this.inventoryService.processTransaction({
      plantId: dto.sourcePlantId,
      itemType: dto.itemType,
      itemCategory: dto.itemCategory,
      quantity: -dto.quantity,
      transactionType: TransactionType.TRANSFER,
      referenceId: transfer.id,
      remarks: `Transfer OUT to Plant ${dto.targetPlantId}`,
    });

    return transfer;
  }

  async receiveTransfer(transferId: string, userId: string, itemCategory: ItemCategory) {
    const transfer = await this.prisma.plantTransfer.findUnique({ where: { id: transferId } });
    
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new BadRequestException(`Transfer is not in IN_TRANSIT status. Current: ${transfer.status}`);
    }

    // 1. Mark as RECEIVED
    const updatedTransfer = await this.prisma.plantTransfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.RECEIVED,
        receivedBy: userId,
      }
    });

    // 2. Add to Target Plant via Atomic Transaction
    await this.inventoryService.processTransaction({
      plantId: transfer.targetPlantId,
      itemType: transfer.itemType,
      itemCategory,
      quantity: transfer.quantity,
      transactionType: TransactionType.TRANSFER,
      referenceId: transfer.id,
      remarks: `Transfer IN from Plant ${transfer.sourcePlantId}`,
    });

    return updatedTransfer;
  }

  async getTransfersForPlant(plantId: string) {
    return this.prisma.plantTransfer.findMany({
      where: {
        OR: [
          { sourcePlantId: plantId },
          { targetPlantId: plantId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sourcePlant: { select: { id: true, name: true, code: true } },
        targetPlant: { select: { id: true, name: true, code: true } }
      }
    });
  }
}

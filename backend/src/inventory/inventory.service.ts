import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, ItemCategory } from '@prisma/client';

export interface ProcessTransactionDto {
  plantId: string;
  itemType: string;
  itemCategory: ItemCategory;
  quantity: number; // positive for IN, negative for OUT
  transactionType: TransactionType;
  referenceId?: string;
  remarks?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async processTransaction(dto: ProcessTransactionDto) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Find or create the InventoryItem
      let inventoryItem = await prisma.inventoryItem.findUnique({
        where: {
          plantId_itemType: {
            plantId: dto.plantId,
            itemType: dto.itemType,
          },
        },
      });

      if (!inventoryItem) {
        inventoryItem = await prisma.inventoryItem.create({
          data: {
            plantId: dto.plantId,
            itemType: dto.itemType,
            itemCategory: dto.itemCategory,
            quantity: 0,
          },
        });
      }

      // Check for negative stock
      const newQuantity = inventoryItem.quantity + dto.quantity;
      if (newQuantity < 0 && dto.transactionType !== TransactionType.ADJUSTMENT) {
        throw new BadRequestException(`Insufficient stock for ${dto.itemType}. Current: ${inventoryItem.quantity}`);
      }

      // 2. Update InventoryItem quantity
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: newQuantity },
      });

      // 3. Create StockLedger entry
      const ledger = await prisma.stockLedger.create({
        data: {
          inventoryItemId: inventoryItem.id,
          transactionType: dto.transactionType,
          quantity: dto.quantity, // keeps sign for reference
          referenceId: dto.referenceId,
          remarks: dto.remarks,
        },
      });

      return { inventoryItem: updatedItem, ledger };
    });
  }

  async getInventoryMatrix(plantId: string, category?: ItemCategory) {
    return this.prisma.inventoryItem.findMany({
      where: {
        plantId,
        ...(category ? { itemCategory: category } : {}),
      },
      include: {
        stockLedgers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getStockLedger(inventoryItemId: string) {
    return this.prisma.stockLedger.findMany({
      where: { inventoryItemId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetInventoryFilterDto, GetStockReportDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getByProductStock(plantId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { plantId, itemType: 'BYPRODUCT' }
    });
    
    // Map array to object: { 'R. Bran': 100, 'K. Phuck': 50 }
    const stockMap: Record<string, number> = {};
    inventories.forEach(inv => {
      if (inv.variety) {
        stockMap[inv.variety] = inv.quantity;
      }
    });
    return stockMap;
  }


  async adjustStock(params: {
    plantId: string;
    itemType: string;
    variety?: string;
    godown?: string;
    quantityChange: number;
    transactionType: string;
    referenceId?: string;
    remarks?: string;
    shift?: string;
    usableChange?: number;
    category?: string;
    unit?: string;
    stockValueChange?: number;
  }) {
    const { plantId, itemType, variety, godown, quantityChange, transactionType, referenceId, remarks, shift, usableChange = 0, category, unit, stockValueChange = 0 } = params;
    const resolvedGodown = godown || 'Main Yard';
    const resolvedVariety = variety || 'Standard';

    // 1. Find or create the inventory record
    let inventory = await this.prisma.inventory.findFirst({
      where: { plantId, itemType, variety: resolvedVariety, godown: resolvedGodown }
    });

    if (inventory) {
      inventory = await this.prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { increment: quantityChange },
          usable: { increment: usableChange || quantityChange }, // Default to full usable change if not specified
          stockValue: { increment: stockValueChange }
        }
      });
    } else {
      inventory = await this.prisma.inventory.create({
        data: {
          plantId,
          itemType,
          variety: resolvedVariety,
          godown: resolvedGodown,
          quantity: quantityChange,
          usable: usableChange || quantityChange,
          category: category || 'Operational',
          unit: unit || 'MT',
          stockValue: stockValueChange
        }
      });
    }

    // 2. Log in Stock Ledger
    await this.prisma.stockLedger.create({
      data: {
        plantId,
        transaction: transactionType, // IN, OUT, TRANSFER, ADJUSTMENT
        itemType,
        quantity: quantityChange,
        shift,
        reference: referenceId,
        remarks
      }
    });

    return inventory;
  }

  async getDashboardSummary(plantId: string, itemType?: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { plantId }
    });

    const globalMetrics = {
      PADDY: { total: 0, value: 0 },
      RICE: { total: 0, value: 0 },
      BRAN: { total: 0, value: 0 },
      HUSK: { total: 0, value: 0 },
      FINISHED_GOODS: { total: 0, value: 0 },
      CONSUMABLES: { total: 0, value: 0 }
    };

    let tabTotalQuantity = 0;
    let tabTotalUsable = 0;
    let tabTotalReserved = 0;
    let tabTotalDamaged = 0;
    let tabTotalAssetValue = 0;

    const stockComposition = {};
    const godownStockData = {};
    
    // Determine the actual item type for the tab filter
    const filterItemType = itemType === 'FINISHED_GOODS' ? 'RICE' : (itemType || 'PADDY');

    inventories.forEach(item => {
      const qty = item.quantity || 0;
      const value = item.stockValue || 0;
      
      // Update Global Metrics
      // Assuming FINISHED_GOODS is RICE with some specific criteria, or just RICE for now.
      if (item.itemType === 'PADDY') { globalMetrics.PADDY.total += qty; globalMetrics.PADDY.value += value; }
      else if (item.itemType === 'RICE') { globalMetrics.RICE.total += qty; globalMetrics.RICE.value += value; }
      else if (item.itemType === 'BRAN') { globalMetrics.BRAN.total += qty; globalMetrics.BRAN.value += value; }
      else if (item.itemType === 'HUSK') { globalMetrics.HUSK.total += qty; globalMetrics.HUSK.value += value; }
      else if (item.itemType === 'CONSUMABLES') { globalMetrics.CONSUMABLES.total += qty; globalMetrics.CONSUMABLES.value += value; }
      
      // (For this demo, we'll map FINISHED_GOODS as 15% of RICE to distinguish it, or if there's a category field use that. We'll just use a mock fraction for Finished Goods for display purposes if no category is present)
      
      // Stock Composition (Global)
      const compositionKey = item.itemType;
      stockComposition[compositionKey] = (stockComposition[compositionKey] || 0) + qty;

      // Update Tab Specific Metrics
      if (item.itemType === filterItemType) {
        tabTotalQuantity += qty;
        tabTotalUsable += item.usable || 0;
        tabTotalReserved += item.reserved || 0;
        tabTotalDamaged += item.damaged || 0;
        tabTotalAssetValue += value;

        // Godown Distribution (Tab Specific)
        if (item.godown) {
          if (!godownStockData[item.godown]) {
            godownStockData[item.godown] = { godown: item.godown, variety: item.variety || item.itemType, stock: 0, usable: 0, reserved: 0, damaged: 0 };
          }
          godownStockData[item.godown].stock += qty;
          godownStockData[item.godown].usable += item.usable || 0;
          godownStockData[item.godown].reserved += item.reserved || 0;
          godownStockData[item.godown].damaged += item.damaged || 0;
        }
      }
    });
    
    globalMetrics.FINISHED_GOODS.total = globalMetrics.RICE.total * 0.15; // Mocking Finished Goods
    globalMetrics.FINISHED_GOODS.value = globalMetrics.RICE.value * 0.2;

    const tabMetrics = [
      { label: 'Total Stock', value: tabTotalQuantity.toFixed(3), unit: 'MT', type: 'TOTAL', color: 'text-gray-900' },
      { label: 'Useable Stock', value: tabTotalUsable.toFixed(3), unit: 'MT', type: 'USABLE', color: 'text-green-600' },
      { label: 'Reserved Stock', value: tabTotalReserved.toFixed(3), unit: 'MT', type: 'RESERVED', color: 'text-orange-500' },
      { label: 'Damaged / Rejected', value: tabTotalDamaged.toFixed(3), unit: 'MT', type: 'DAMAGED', color: 'text-red-500' }
    ];

    return {
      globalMetrics,
      tabMetrics,
      stockComposition: Object.keys(stockComposition).map(k => ({ name: k, value: stockComposition[k] })),
      godownStockData: Object.values(godownStockData)
    };
  }

  async getInventoryList(plantId: string, filterDto: GetInventoryFilterDto) {
    const { itemType, godown } = filterDto;
    
    // For Finished Goods frontend grouping, it passes itemType=FINISHED_GOODS
    // but in DB it's stored as RICE with category 'Operational' or similar. 
    // We can map it if needed, but sticking to basic mapping for now.
    
    let whereClause: any = { plantId };
    
    if (itemType && itemType !== 'all') {
      if (itemType === 'FINISHED_GOODS') {
        whereClause.itemType = 'RICE';
      } else {
        whereClause.itemType = itemType;
      }
    }
    
    if (godown && godown !== 'all') {
      whereClause.godown = godown;
    }

    return await this.prisma.inventory.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getStockReport(plantId: string, filterDto: GetStockReportDto) {
    const targetDate = filterDto.date ? new Date(filterDto.date) : new Date();
    // Start of the day (e.g. 6:00 AM if we follow typical mill shifts, but let's use 00:00 for simplicity)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all items in inventory
    const allItems = await this.prisma.inventory.findMany({
      where: { plantId },
      distinct: ['itemType', 'variety'],
      select: { itemType: true, variety: true }
    });

    const report: any[] = [];

    for (const item of allItems) {
      const { itemType, variety } = item;
      
      // Calculate Opening Balance (sum of all transactions BEFORE startOfDay)
      const pastTransactions = await this.prisma.stockLedger.aggregate({
        where: {
          plantId,
          itemType,
          createdAt: { lt: startOfDay }
        },
        _sum: {
          quantity: true
        }
      });
      // We assume quantity is signed (positive for IN, negative for OUT)
      // Or if transaction type determines sign:
      const pastIn = await this.prisma.stockLedger.aggregate({
        where: { plantId, itemType, transaction: 'IN', createdAt: { lt: startOfDay } },
        _sum: { quantity: true }
      });
      const pastOut = await this.prisma.stockLedger.aggregate({
        where: { plantId, itemType, transaction: 'OUT', createdAt: { lt: startOfDay } },
        _sum: { quantity: true }
      });
      
      const opBal = (pastIn._sum.quantity || 0) - (pastOut._sum.quantity || 0);

      // Day / Night IN
      const todayIn = await this.prisma.stockLedger.findMany({
        where: { plantId, itemType, transaction: 'IN', createdAt: { gte: startOfDay, lte: endOfDay } }
      });
      const dayIn = todayIn.filter(t => t.shift === 'Day').reduce((sum, t) => sum + t.quantity, 0);
      const nightIn = todayIn.filter(t => t.shift === 'Night').reduce((sum, t) => sum + t.quantity, 0);
      // Fallback for missing shifts
      const otherIn = todayIn.filter(t => t.shift !== 'Day' && t.shift !== 'Night').reduce((sum, t) => sum + t.quantity, 0);

      // Day / Night OUT
      const todayOut = await this.prisma.stockLedger.findMany({
        where: { plantId, itemType, transaction: 'OUT', createdAt: { gte: startOfDay, lte: endOfDay } }
      });
      const dayOut = todayOut.filter(t => t.shift === 'Day').reduce((sum, t) => sum + t.quantity, 0);
      const nightOut = todayOut.filter(t => t.shift === 'Night').reduce((sum, t) => sum + t.quantity, 0);
      const otherOut = todayOut.filter(t => t.shift !== 'Day' && t.shift !== 'Night').reduce((sum, t) => sum + t.quantity, 0);

      const totalIn = dayIn + nightIn + otherIn;
      const totalOut = dayOut + nightOut + otherOut;
      const totalAvailable = opBal + totalIn;
      const clBal = totalAvailable - totalOut;

      report.push({
        item: variety ? `${variety} (${itemType})` : itemType,
        opBal: opBal.toFixed(2),
        dayIn: dayIn.toFixed(2),
        nightIn: nightIn.toFixed(2),
        otherIn: otherIn.toFixed(2), // Optional
        totalAvailable: totalAvailable.toFixed(2),
        dayOut: dayOut.toFixed(2),
        nightOut: nightOut.toFixed(2),
        clBal: clBal.toFixed(2)
      });
    }

    return report;
  }

  async getLedger(plantId: string, filterDto: any) {
    const { itemType, transactionType, startDate, endDate } = filterDto;
    
    let whereClause: any = { plantId };
    
    if (itemType && itemType !== 'all') {
      whereClause.itemType = itemType;
    }
    
    if (transactionType && transactionType !== 'all') {
      whereClause.transaction = transactionType;
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    return await this.prisma.stockLedger.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(plantId: string) {
    const userCount = await this.prisma.userPlantAccess.count({
      where: { plantId },
    });

    // Mock aggregation for Procurement (Since we just created it, it will be 0)
    const procurementAgg = await this.prisma.procurementBatch.aggregate({
      where: { plantId },
      _sum: { netWeight: true },
      _count: { gatePassId: true },
    });

    // Mock aggregation for Inventory
    const inventoryAgg = await this.prisma.inventory.aggregate({
      where: { plantId, itemType: 'PADDY' },
      _sum: { quantity: true },
    });

    return {
      activeUsers: userCount,
      procurementMT: procurementAgg._sum.netWeight || 0,
      inventoryMT: inventoryAgg._sum.quantity || 0,
      gatePasses: procurementAgg._count.gatePassId || 0,
    };
  }
}

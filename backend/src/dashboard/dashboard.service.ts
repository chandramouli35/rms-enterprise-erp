import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function getDateFilter(filter?: string) {
  if (!filter) return {};
  const date = new Date();
  if (filter === 'Today') {
    date.setHours(0, 0, 0, 0);
    return { createdAt: { gte: date } };
  }
  if (filter === 'This Week') {
    date.setDate(date.getDate() - date.getDay());
    date.setHours(0, 0, 0, 0);
    return { createdAt: { gte: date } };
  }
  if (filter === 'This Month') {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return { createdAt: { gte: date } };
  }
  if (filter === 'This Year') {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
    return { createdAt: { gte: date } };
  }
  return {};
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(plantId: string, filter?: string) {
    const dateFilter = getDateFilter(filter);
    const pFilter = plantId !== 'global' ? { plantId } : {};

    const [
      stockIn,
      production,
      milling,
      inventory,
      dispatch
    ] = await Promise.all([
      this.prisma.stockLedger.aggregate({
        where: { ...pFilter, transaction: 'IN', itemType: 'PADDY', ...dateFilter },
        _sum: { quantity: true }
      }),
      this.prisma.productionBatch.aggregate({
        where: { ...pFilter, ...dateFilter },
        _sum: { riceProducedQty: true }
      }),
      this.prisma.productionBatch.aggregate({
        where: { ...pFilter, ...dateFilter },
        _sum: { riceProducedQty: true, paddyUsedQty: true }
      }),
      this.prisma.inventory.aggregate({
        where: { ...pFilter }, // Inventory is a snapshot, usually not filtered by created date in this context
        _sum: { quantity: true }
      }),
      this.prisma.gatePass.aggregate({
        where: { ...pFilter, passType: 'OUTWARD', ...dateFilter },
        _sum: { netWeight: true }
      })
    ]);

    const paddyProcured = stockIn._sum.quantity || 0;
    const totalProduction = production._sum.riceProducedQty || 0;
    const avgYield = milling._sum.paddyUsedQty 
      ? ((milling._sum.riceProducedQty || 0) / milling._sum.paddyUsedQty) * 100 
      : 0;
    const totalStock = inventory._sum.quantity || 0;
    const dispatchValue = dispatch._sum.netWeight || 0;
    
    // Fake the trends for demonstration
    return {
      procurementMT: paddyProcured,
      procurementTrend: '+12.5%',
      productionMT: totalProduction,
      productionTrend: '+10.8%',
      averageYield: avgYield.toFixed(2),
      yieldTrend: '+2.4%',
      inventoryMT: totalStock,
      inventoryTrend: '+8.7%',
      dispatchMT: dispatchValue, // Use actual weight
      dispatchTrend: '+15.3%',
      gatePasses: dispatchValue, // Keeping variable name for backward compatibility if used elsewhere
      activeUsers: 24, // Mocked user count from users
    };
  }

  async getProcurementChart(filter?: string) {
    const dateFilter = getDateFilter(filter);

    // Top 5 plants procurement
    const topPlants = await this.prisma.stockLedger.groupBy({
      by: ['plantId'],
      where: { transaction: 'IN', ...dateFilter },
      _sum: { quantity: true },
      take: 5,
      orderBy: { _sum: { quantity: 'desc' } }
    });

    const plants = await this.prisma.plant.findMany({
      where: { id: { in: topPlants.map(p => p.plantId) } }
    });

    const colors = ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'];
    
    return topPlants.map((p, index) => {
      const plant = plants.find(pl => pl.id === p.plantId);
      return {
        name: plant?.name || 'Unknown',
        value: p._sum.quantity || 0,
        color: colors[index % colors.length]
      };
    });
  }

  async getYieldTrend(plantId: string, filter?: string) {
    const dateFilter = getDateFilter(filter);
    
    // If no filter, default to 30 days
    const whereClause: any = plantId !== 'global' ? { plantId } : {};
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter.createdAt;
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereClause.createdAt = { gte: thirtyDaysAgo };
    }

    const processes = await this.prisma.productionBatch.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: { yieldReport: true }
    });

    return processes.map(p => ({
      name: p.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: p.yieldReport?.overallRecovery || 0
    }));
  }

  async getStockDonut(plantId: string, filter?: string) {
    const whereClause: any = plantId !== 'global' ? { plantId } : {};
    if (filter && filter !== 'All Items') {
      whereClause.itemType = filter;
    }

    const items = await this.prisma.inventory.findMany({
      where: whereClause
    });
    
    const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);
    const colorMap: any = {
      PADDY: '#e67e00',       // Core Premium Amber
      HEAD_RICE: '#ffb042',   // Lighter Gold/Amber
      BRAN: '#b86500',        // Darker Orange
      HUSK: '#8a4b00',        // Deepest Orange
      CONSUMABLE: '#d97706'   // Alternative Amber
    };

    return items.map(item => ({
      name: item.itemType,
      value: item.quantity,
      color: colorMap[item.itemType] || '#888',
      percent: totalStock ? ((item.quantity / totalStock) * 100).toFixed(1) + '%' : '0%'
    }));
  }

  async getRecentActivities(plantId: string) {
    const pFilter = plantId !== 'global' ? { plantId } : {};
    const [ledgers, passes, batches] = await Promise.all([
      this.prisma.stockLedger.findMany({ where: pFilter, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.gatePass.findMany({ where: pFilter, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.productionBatch.findMany({ where: pFilter, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);

    const combined = [
      ...ledgers.map(l => ({ type: 'Stock', title: `${l.transaction} - ${l.itemType}`, time: l.createdAt, details: `${l.quantity} MT` })),
      ...passes.map(p => ({ type: 'GatePass', title: `${p.passType} Gate Pass`, time: p.createdAt, details: p.vehicleNo })),
      ...batches.map(b => ({ type: 'Production', title: `Batch ${b.batchNo}`, time: b.createdAt, details: `Produced ${b.riceProducedQty} MT of Rice` }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);

    return combined.map(c => ({
      title: c.title,
      details: c.details,
      time: c.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: c.type
    }));
  }

  async getAlerts(plantId: string) {
    const alerts: any[] = [];
    const pFilter = plantId !== 'global' ? { plantId } : {};
    
    // Check low stock
    const inventory = await this.prisma.inventory.findMany({ where: pFilter });
    inventory.forEach(item => {
      if (item.quantity < 50) {
        alerts.push({
          type: 'LowStock',
          title: 'Low Stock Alert',
          details: `${item.itemType} is running low (${item.quantity} MT)`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    // Check yield drop
    const recentYields = await this.prisma.productionBatch.findMany({
      where: pFilter,
      orderBy: { createdAt: 'desc' },
      include: { yieldReport: true },
      take: 1
    });

    if (recentYields.length && recentYields[0].yieldReport && recentYields[0].yieldReport.overallRecovery < 60) {
      alerts.push({
        type: 'YieldDrop',
        title: 'Yield Alert',
        details: `Yield ${recentYields[0].yieldReport.overallRecovery}% is below target`,
        time: recentYields[0].createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    return alerts;
  }

  async getTodaySummary(plantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pFilter = plantId !== 'global' ? { plantId } : {};

    const [procurement, production, milling, dispatch, activeGatePassesCount] = await Promise.all([
      this.prisma.stockLedger.aggregate({
        where: { ...pFilter, transaction: 'IN', createdAt: { gte: today } },
        _sum: { quantity: true }
      }),
      this.prisma.productionBatch.aggregate({
        where: { ...pFilter, createdAt: { gte: today } },
        _sum: { riceProducedQty: true }
      }),
      this.prisma.productionBatch.aggregate({
        where: { ...pFilter, createdAt: { gte: today } },
        _sum: { paddyUsedQty: true, riceProducedQty: true }
      }),
      this.prisma.stockLedger.aggregate({
        where: { ...pFilter, transaction: 'OUT', createdAt: { gte: today } },
        _sum: { quantity: true }
      }),
      this.prisma.gatePass.count({
        where: { ...pFilter, status: 'ACTIVE' }
      })
    ]);

    const avgYield = milling._sum.paddyUsedQty 
      ? ((milling._sum.riceProducedQty || 0) / milling._sum.paddyUsedQty) * 100 
      : 0;
    const prodQty = production._sum.riceProducedQty || 0;

    return {
      paddyProcured: procurement._sum.quantity || 0,
      production: prodQty,
      averageYield: Number(avgYield.toFixed(2)),
      dispatch: dispatch._sum.quantity || 0,
      powerConsumption: Math.round(prodQty * 32.5),
      activeGatePasses: activeGatePassesCount
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PowerManagementService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(plantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's readings
    const readings = await this.prisma.powerReading.findMany({
      where: { plantId, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
    });

    const latest = readings[0] || {
      totalConsumption: 0,
      dgGenerated: 0,
      costToday: 0,
      outageMinutes: 0,
      currentLoad: 0,
      totalCapacity: 1000,
      voltageAvg: 0,
      frequencyAvg: 0,
    };

    return {
      kpis: {
        totalConsumption: latest.totalConsumption,
        dgGenerated: latest.dgGenerated,
        totalCost: latest.costToday,
        outages: latest.outageMinutes,
      },
      overview: {
        currentLoad: latest.currentLoad,
        totalCapacity: latest.totalCapacity,
        loadPercentage: latest.totalCapacity > 0 ? (latest.currentLoad / latest.totalCapacity) * 100 : 0,
        voltageAvg: latest.voltageAvg,
        frequencyAvg: latest.frequencyAvg,
      },
    };
  }

  async getSources(plantId: string) {
    return this.prisma.powerSource.findMany({
      where: { plantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getTrend(plantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const readings = await this.prisma.powerReading.findMany({
      where: { plantId, timestamp: { gte: today } },
      orderBy: { timestamp: 'asc' },
    });

    // Format for chart: { time: '00:00', grid: 120, generator: 0 }
    return readings.map(r => ({
      time: r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      grid: r.gridUsed,
      generator: r.dgGenerated,
    }));
  }

  async getLoadDistribution(plantId: string) {
    return this.prisma.powerLoad.findMany({
      where: { plantId },
      orderBy: { loadValue: 'desc' },
    });
  }

  async getAlerts(plantId: string) {
    return this.prisma.powerAlert.findMany({
      where: { plantId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
  }

  async getSettings(plantId: string) {
    let settings = await this.prisma.powerSetting.findUnique({
      where: { plantId },
    });

    if (!settings) {
      settings = await this.prisma.powerSetting.create({
        data: { plantId },
      });
    }
    return settings;
  }

  async updateSettings(plantId: string, data: any) {
    return this.prisma.powerSetting.update({
      where: { plantId },
      data,
    });
  }

  // --- Mock Data Generator for initial testing ---
  async seedMockData(plantId: string) {
    const count = await this.prisma.powerSource.count({ where: { plantId } });
    if (count > 0) return { message: 'Already seeded' };

    // Seed Sources
    await this.prisma.powerSource.createMany({
      data: [
        { plantId, sourceName: 'DG Set 1', description: '1250 kVA', type: 'Diesel Generator', status: 'Running', currentOutput: 420, runtime: '06h 30m', fuelLevel: 68 },
        { plantId, sourceName: 'DG Set 2', description: '1250 kVA', type: 'Diesel Generator', status: 'Standby', currentOutput: 0, runtime: '00h 00m', fuelLevel: 72 },
        { plantId, sourceName: 'Main Grid', description: 'HT Line', type: 'Grid Power', status: 'Active', currentOutput: 360, runtime: '08h 45m', fuelLevel: null },
      ],
    });

    // Seed Load
    await this.prisma.powerSource.create({
      data: { plantId, sourceName: 'Solar Plant', description: '250 kW', type: 'Solar Power', status: 'Inactive', currentOutput: 0, runtime: '00h 00m', fuelLevel: null }
    });

    await this.prisma.powerLoad.createMany({
      data: [
        { plantId, sectionName: 'Milling Section', loadValue: 420, percentage: 53.8, colorHex: '#3b82f6' },
        { plantId, sectionName: 'Processing Units', loadValue: 180, percentage: 23.1, colorHex: '#22c55e' },
        { plantId, sectionName: 'Packaging', loadValue: 95, percentage: 12.2, colorHex: '#eab308' },
        { plantId, sectionName: 'Storage & HVAC', loadValue: 60, percentage: 7.7, colorHex: '#a855f7' },
        { plantId, sectionName: 'Office & Lighting', loadValue: 25, percentage: 3.2, colorHex: '#ef4444' },
      ],
    });

    // Seed Alerts
    await this.prisma.powerAlert.createMany({
      data: [
        { plantId, title: 'DG Set 1 Started', description: 'Auto-started due to grid failure', type: 'warning' },
        { plantId, title: 'Grid Power Restored', description: 'Mains voltage normalized', type: 'success' },
        { plantId, title: 'High Load Warning', description: 'Milling section exceeding 400kW', type: 'error' },
      ],
    });

    // Seed some readings for today
    const readings: any[] = [];
    const now = new Date();
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      readings.push({
        plantId,
        timestamp: d,
        totalConsumption: 8450,
        dgGenerated: Math.floor(Math.random() * 500),
        gridUsed: Math.floor(Math.random() * 1000),
        costToday: 14250,
        outageMinutes: 45,
        currentLoad: 780,
        totalCapacity: 1000,
        voltageAvg: 412,
        frequencyAvg: 50.01,
        powerFactor: 0.94,
      });
    }
    await this.prisma.powerReading.createMany({ data: readings });

    return { message: 'Seeded successfully' };
  }
}

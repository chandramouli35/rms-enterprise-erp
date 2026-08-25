import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DryerWorkService {
  constructor(private prisma: PrismaService) {}

  async createGoyalAgroLog(plantId: string, data: any) {
    return this.prisma.goyalAgroDryerLog.create({
      data: {
        plantId,
        date: new Date(data.date),
        dryerWork: data.dryerWork,
        series: data.series,
        hodiKataiMc: data.hodiKataiMc || [],
        
        d1HeatDay: data.d1HeatDay,
        d1McDay: data.d1McDay,
        d1LoadTimeDay: data.d1LoadTimeDay,
        d1UnloadTimeDay: data.d1UnloadTimeDay,
        d1HoursDay: data.d1HoursDay,

        d2HeatDay: data.d2HeatDay,
        d2McDay: data.d2McDay,
        d2LoadTimeDay: data.d2LoadTimeDay,
        d2UnloadTimeDay: data.d2UnloadTimeDay,
        d2HoursDay: data.d2HoursDay,

        d1HeatNight: data.d1HeatNight,
        d1McNight: data.d1McNight,
        d1LoadTimeNight: data.d1LoadTimeNight,
        d1UnloadTimeNight: data.d1UnloadTimeNight,
        d1HoursNight: data.d1HoursNight,

        d2HeatNight: data.d2HeatNight,
        d2McNight: data.d2McNight,
        d2LoadTimeNight: data.d2LoadTimeNight,
        d2UnloadTimeNight: data.d2UnloadTimeNight,
        d2HoursNight: data.d2HoursNight,

        binLoad1Day: data.binLoad1Day,
        binLoad2Day: data.binLoad2Day,
        binLoad3Day: data.binLoad3Day,

        binUnload1: data.binUnload1,
        binUnload2: data.binUnload2,
        binUnload3: data.binUnload3,

        binLoad1Night: data.binLoad1Night,
        binLoad2Night: data.binLoad2Night,
        binLoad3Night: data.binLoad3Night,

        fmSign: data.fmSign,
        dayOilManSign: data.dayOilManSign,
        dayMunimSign: data.dayMunimSign,
        nightOilManSign: data.nightOilManSign,
        nightMunimSign: data.nightMunimSign,
      }
    });
  }

  async getGoyalAgroLogs(plantId: string, date?: string) {
    const whereClause: any = { plantId };

    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      whereClause.date = { gte: start, lte: end };
    }

    return this.prisma.goyalAgroDryerLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: date ? undefined : 100 // Limit to 100 if fetching all
    });
  }

  async createRajoaAgroLog(plantId: string, data: any) {
    return this.prisma.rajoaAgroDryerLog.create({
      data: {
        plantId,
        date: new Date(data.date),
        dryerWork: data.dryerWork,
        series: data.series,
        hodiKataiMc: data.hodiKataiMc || [],
        
        d1HeatDay: data.d1HeatDay,
        d1McDay: data.d1McDay,
        d1LoadTimeDay: data.d1LoadTimeDay,
        d1UnloadTimeDay: data.d1UnloadTimeDay,
        d1HoursDay: data.d1HoursDay,

        d2HeatDay: data.d2HeatDay,
        d2McDay: data.d2McDay,
        d2LoadTimeDay: data.d2LoadTimeDay,
        d2UnloadTimeDay: data.d2UnloadTimeDay,
        d2HoursDay: data.d2HoursDay,

        d1HeatNight: data.d1HeatNight,
        d1McNight: data.d1McNight,
        d1LoadTimeNight: data.d1LoadTimeNight,
        d1UnloadTimeNight: data.d1UnloadTimeNight,
        d1HoursNight: data.d1HoursNight,

        d2HeatNight: data.d2HeatNight,
        d2McNight: data.d2McNight,
        d2LoadTimeNight: data.d2LoadTimeNight,
        d2UnloadTimeNight: data.d2UnloadTimeNight,
        d2HoursNight: data.d2HoursNight,

        binLoad1Day: data.binLoad1Day,
        binLoad2Day: data.binLoad2Day,
        binLoad3Day: data.binLoad3Day,
        binLoad4Day: data.binLoad4Day,
        binLoad5Day: data.binLoad5Day,
        binLoad6Day: data.binLoad6Day,

        binUnload1: data.binUnload1,
        binUnload2: data.binUnload2,
        binUnload3: data.binUnload3,
        binUnload4: data.binUnload4,
        binUnload5: data.binUnload5,
        binUnload6: data.binUnload6,

        binLoad1Night: data.binLoad1Night,
        binLoad2Night: data.binLoad2Night,
        binLoad3Night: data.binLoad3Night,
        binLoad4Night: data.binLoad4Night,
        binLoad5Night: data.binLoad5Night,
        binLoad6Night: data.binLoad6Night,

        fmSign: data.fmSign,
        dayOilManSign: data.dayOilManSign,
        dayMunimSign: data.dayMunimSign,
        nightOilManSign: data.nightOilManSign,
        nightMunimSign: data.nightMunimSign,
      }
    });
  }

  async getRajoaAgroLogs(plantId: string, date?: string) {
    const whereClause: any = { plantId };

    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      whereClause.date = { gte: start, lte: end };
    }

    return this.prisma.rajoaAgroDryerLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: date ? undefined : 100
    });
  }

  // --- BEAS AGRO ---
  async createBeasAgroLog(plantId: string, data: any) {
    if (data.date) {
      data.date = new Date(data.date);
    }
    return this.prisma.beasAgroDryerLog.create({
      data: {
        ...data,
        plantId,
      }
    });
  }

  async getBeasAgroLogs(plantId: string, date?: string) {
    const whereClause: any = { plantId };
    
    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      whereClause.date = { gte: start, lte: end };
    }

    return this.prisma.beasAgroDryerLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: date ? undefined : 100
    });
  }
}

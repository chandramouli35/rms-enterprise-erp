import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeighbridgeService {
  constructor(private prisma: PrismaService) {}

  async streamWeight(vehicleNo: string) {
    // Check if the vehicle has an active INWARD GatePass
    const activePass = await this.prisma.gatePass.findFirst({
      where: { vehicleNo, status: 'ACTIVE', passType: 'INWARD' }
    });

    if (!activePass) {
      throw new NotFoundException(`No active INWARD gate pass found for vehicle ${vehicleNo}`);
    }

    // Mock a stable scale reading
    return {
      vehicleNo,
      grossWeight: 9400,
      status: 'Stable',
      timestamp: new Date()
    };
  }

  async saveTransaction(data: any) {
    const { 
      plantId, vehicleNo, grossWeight, tareWeight, netWeight,
      transactionType, driverName, materialType, supplierName, challanNo, remarks, gatePassId
    } = data;
    
    let resolvedGatePassId: string | null = null;
    if (gatePassId) {
      const gp = await this.prisma.gatePass.findFirst({
        where: { qrCode: gatePassId, plantId }
      });
      if (gp) {
        resolvedGatePassId = gp.id;
        // Update Gate Pass with Supervisor details
        await this.prisma.gatePass.update({
          where: { id: resolvedGatePassId },
          data: {
            sodaPendingId: data.sodaPendingId,
            qualityCutType: data.qualityCutType,
            qualityCutValue: data.qualityCutValue,
            qualityCutReason: data.qualityCutReason,
            noOfBags: data.bagsReceived
          }
        });
      }
    }
    
    const transaction = await this.prisma.weighbridgeTransaction.create({
      data: {
        plantId,
        vehicleNo,
        transactionType,
        driverName,
        materialType,
        supplierName,
        challanNo,
        remarks,
        gatePassId: resolvedGatePassId,
        grossWeight,
        tareWeight,
        netWeight,
        grossTime: new Date(),
        status: 'COMPLETED'
      }
    });

    return transaction;
  }

  async getHistory(plantId: string) {
    return this.prisma.weighbridgeTransaction.findMany({
      where: { plantId },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to recent 100 for now, or add pagination
    });
  }

  async getSettings(plantId: string) {
    let settings = await this.prisma.weighbridgeSettings.findUnique({
      where: { plantId }
    });

    if (!settings) {
      settings = await this.prisma.weighbridgeSettings.create({
        data: { plantId }
      });
    }

    return settings;
  }

  async updateSettings(plantId: string, data: any) {
    return this.prisma.weighbridgeSettings.upsert({
      where: { plantId },
      update: data,
      create: { plantId, ...data }
    });
  }
}
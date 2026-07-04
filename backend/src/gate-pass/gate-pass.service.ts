import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GatePassService {
  constructor(private prisma: PrismaService) {}

  async generateGatePass(data: any) {
    const { 
      plantId, passType, vehicleNo, vehicleType, purpose, 
      supplierId, material, driverName, contactNo, 
      challanNo, noOfBags, grossWeight, tareWeight, netWeight 
    } = data;
    
    // Duplicate prevention for INWARD passes
    if (passType === 'INWARD') {
      const existingActivePass = await this.prisma.gatePass.findFirst({
        where: {
          plantId,
          vehicleNo,
          passType: 'INWARD',
          status: 'ACTIVE'
        }
      });

      if (existingActivePass) {
        // Log the duplicate attempt
        await this.prisma.duplicateGatePassLog.create({
          data: {
            plantId,
            vehicleNo,
            attemptedType: 'INWARD',
            reason: 'Vehicle already has an active INWARD pass'
          }
        });
        throw new ConflictException(`Vehicle ${vehicleNo} already has an active INWARD pass in the campus.`);
      }
    }
    
    // Generate sequential ticket (e.g. GIN-2026-00046)
    const lastPass = await this.prisma.gatePass.findFirst({
      where: { plantId, passType },
      orderBy: { createdAt: 'desc' }
    });
    
    let nextSeq = 1;
    if (lastPass && lastPass.qrCode) {
      const parts = lastPass.qrCode.split('-');
      if (parts.length === 3) {
        nextSeq = parseInt(parts[2], 10) + 1;
      }
    }
    const seq = String(nextSeq).padStart(5, '0');
    const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
    const year = new Date().getFullYear();
    const qrCode = `${prefix}-${year}-${seq}`;

    const newPass = await this.prisma.gatePass.create({
      data: {
        plantId,
        passType,
        vehicleNo,
        vehicleType,
        purpose,
        supplierId: supplierId || null,
        material,
        driverName,
        contactNo,
        challanNo,
        noOfBags: noOfBags ? parseInt(noOfBags) : null,
        grossWeight: grossWeight ? parseFloat(grossWeight) : null,
        tareWeight: tareWeight ? parseFloat(tareWeight) : null,
        netWeight: netWeight ? parseFloat(netWeight) : null,
        status: 'ACTIVE',
        qrCode
      },
      include: { supplier: true }
    });
    return newPass;
  }

  async getRecentGatePasses(plantId: string, type: string) {
    return this.prisma.gatePass.findMany({
      where: { plantId, passType: type },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { supplier: true }
    });
  }

  async getGatePassByQr(qrCode: string) {
    const pass = await this.prisma.gatePass.findFirst({
      where: { qrCode },
      include: { supplier: true }
    });
    if (!pass) {
      throw new NotFoundException(`Gate pass with QR code ${qrCode} not found`);
    }
    return pass;
  }

  async getAnalytics(plantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalGateIn = await this.prisma.gatePass.count({
      where: { plantId, passType: 'INWARD', createdAt: { gte: today } }
    });
    
    const totalGateOut = await this.prisma.gatePass.count({
      where: { plantId, passType: 'OUTWARD', createdAt: { gte: today } }
    });

    const activeInward = await this.prisma.gatePass.count({
      where: { plantId, status: 'ACTIVE', passType: 'INWARD' }
    });

    return {
      totalGateIn,
      totalGateOut,
      qrScanned: totalGateIn + totalGateOut, // Mocked for now
      duplicatesBlocked: 5, // Mocked for now
      activeGatePass: activeInward
    };
  }

  async getCampusStatus(plantId: string) {
    const activeInward = await this.prisma.gatePass.count({
      where: { plantId, status: 'ACTIVE', passType: 'INWARD' }
    });
    const completed = await this.prisma.gatePass.count({
      where: { plantId, status: 'COMPLETED' }
    });

    return {
      activeInward,
      completed,
      total: activeInward + completed
    };
  }

  async getDuplicateLogs(plantId: string) {
    return this.prisma.duplicateGatePassLog.findMany({
      where: { plantId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }
}
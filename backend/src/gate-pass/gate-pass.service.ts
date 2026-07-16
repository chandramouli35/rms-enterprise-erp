import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class GatePassService {
  constructor(private prisma: PrismaService, private inventoryService: InventoryService) {}

  async generateGatePass(data: any) {
    const { 
      plantId, passType, vehicleNo, vehicleType, purpose, 
      supplierId, material, driverName, contactNo, 
      challanNo, noOfBags, grossWeight, tareWeight, netWeight,
      emptyVideoTime, loadedVideoTime, partyName, ntWtParty, sodaNo, remarks
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
    
    const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
    const year = new Date().getFullYear();

    // Generate sequential ticket (e.g. GIN-2026-00046)
    const lastPass = await this.prisma.gatePass.findFirst({
      where: { 
        plantId, 
        passType,
        qrCode: { startsWith: `${prefix}-${year}-` }
      },
      orderBy: { qrCode: 'desc' }
    });
    
    let nextSeq = 1;
    if (lastPass && lastPass.qrCode) {
      const parts = lastPass.qrCode.split('-');
      if (parts.length === 3) {
        nextSeq = parseInt(parts[2], 10) + 1;
      }
    }
    const seq = String(nextSeq).padStart(5, '0');
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
        emptyVideoTime,
        loadedVideoTime,
        partyName,
        ntWtParty: ntWtParty ? parseFloat(ntWtParty) : null,
        sodaNo,
        remarks,
        biometricData: data.biometricData || null,
        status: 'ACTIVE',
        qrCode
      },
      include: { 
        supplier: true,
        procurementBatch: {
          include: {
            quality: true,
            weighbridge: true,
            paddyInwardDetails: true
          }
        }
      }
    });
    return newPass;
  }

  async getRecentGatePasses(plantId: string, type: string) {
    const whereClause: any = plantId === 'global' ? {} : { plantId };
    if (type !== 'ALL') {
      whereClause.passType = type;
    }
    
    return this.prisma.gatePass.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: type === 'ALL' ? 50 : 5,
      include: { supplier: true }
    });
  }

  async getGatePassByQr(qrCode: string) {
    const pass = await this.prisma.gatePass.findFirst({
      where: { qrCode },
      include: { 
        supplier: true,
        procurementBatch: {
          include: {
            quality: true,
            weighbridge: true,
            paddyInwardDetails: true
          }
        }
      }
    });
    if (!pass) {
      throw new NotFoundException(`Gate pass with QR code ${qrCode} not found`);
    }

    // Try to find a weighbridge transaction for this vehicle created after the gate pass
    const latestWeighbridge = await this.prisma.weighbridgeTransaction.findFirst({
      where: {
        plantId: pass.plantId,
        vehicleNo: pass.vehicleNo,
        createdAt: { gte: pass.createdAt }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      ...pass,
      latestWeighbridge
    };
  }

  async getAnalytics(plantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause = plantId === 'global' ? {} : { plantId };

    const totalGateIn = await this.prisma.gatePass.count({
      where: { ...whereClause, passType: 'INWARD', createdAt: { gte: today } }
    });
    
    const totalGateOut = await this.prisma.gatePass.count({
      where: { ...whereClause, passType: 'OUTWARD', createdAt: { gte: today } }
    });

    const activeInward = await this.prisma.gatePass.count({
      where: { ...whereClause, status: 'ACTIVE', passType: 'INWARD' }
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
    const whereClause = plantId === 'global' ? {} : { plantId };
    const activeInward = await this.prisma.gatePass.count({
      where: { ...whereClause, status: 'ACTIVE', passType: 'INWARD' }
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
    const whereClause = plantId === 'global' ? {} : { plantId };
    return this.prisma.duplicateGatePassLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async completeGatePass(id: string) {
    const pass = await this.prisma.gatePass.findUnique({ where: { id } });
    if (!pass) throw new NotFoundException('Gate Pass not found');
    if (pass.status === 'COMPLETED') throw new BadRequestException('Gate Pass already completed');

    const updatedPass = await this.prisma.gatePass.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    // If OUTWARD, deduct stock
    if (pass.passType === 'OUTWARD' && pass.netWeight && pass.material) {
      let itemType = 'FINISHED_GOODS';
      if (pass.material.toUpperCase().includes('RICE')) itemType = 'RICE';
      if (pass.material.toUpperCase().includes('BRAN')) itemType = 'BRAN';
      if (pass.material.toUpperCase().includes('HUSK')) itemType = 'HUSK';

      await this.inventoryService.adjustStock({
        plantId: pass.plantId,
        itemType: itemType,
        variety: pass.material,
        quantityChange: -pass.netWeight,
        transactionType: 'OUT',
        referenceId: pass.id,
        remarks: `Dispatched via Gate Pass ${pass.qrCode}`
      });
    }

    return updatedPass;
  }
}
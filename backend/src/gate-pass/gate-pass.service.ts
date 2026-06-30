import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GatePassService {
  constructor(private prisma: PrismaService) {}

  async generateGatePass(data: any) {
    const { plantId, passType, vehicleNo, purpose, driverName, contactNo } = data;
    
    // Generate sequential ticket (e.g. GIN-2026-00046)
    const count = await this.prisma.gatePass.count({
      where: { plantId, passType }
    });
    const seq = String(count + 1).padStart(5, '0');
    const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
    const year = new Date().getFullYear();
    const qrCode = `${prefix}-${year}-${seq}`;

    const newPass = await this.prisma.gatePass.create({
      data: {
        plantId,
        passType,
        vehicleNo,
        purpose,
        driverName,
        contactNo,
        status: 'ACTIVE',
        qrCode
      }
    });
    return newPass;
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
}
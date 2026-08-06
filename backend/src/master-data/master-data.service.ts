import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ===================== TRUCK MASTER =====================
  async getTrucks(plantId: string, page?: string, limit?: string) {
    const where = { plantId, isApproved: true };
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      const [total, data] = await this.prisma.$transaction([
        this.prisma.truckMaster.count({ where }),
        this.prisma.truckMaster.findMany({ where, orderBy: { truckNumber: 'asc' }, skip, take: limitNum })
      ]);
      return { data, total };
    }
    return this.prisma.truckMaster.findMany({ where, orderBy: { truckNumber: 'asc' } });
  }

  async getAllTrucks(plantId: string, page?: string, limit?: string) {
    const where = { plantId };
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      const [total, data] = await this.prisma.$transaction([
        this.prisma.truckMaster.count({ where }),
        this.prisma.truckMaster.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum })
      ]);
      return { data, total };
    }
    return this.prisma.truckMaster.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createTruck(plantId: string, data: { truckNumber: string, capacity?: number, isApproved?: boolean }) {
    return this.prisma.truckMaster.create({
      data: { plantId, ...data }
    });
  }

  async approveTruck(id: string) {
    return this.prisma.truckMaster.update({
      where: { id },
      data: { isApproved: true }
    });
  }

  async rejectTruck(id: string) {
    return this.prisma.truckMaster.delete({
      where: { id }
    });
  }

  async deleteTruck(id: string) {
    return this.prisma.truckMaster.delete({ where: { id } });
  }

  // ===================== DRIVER MASTER =====================
  async getDrivers(plantId: string) {
    return this.prisma.driverMaster.findMany({ where: { plantId }, orderBy: { name: 'asc' } });
  }

  async createDriver(plantId: string, data: { name: string, licenseNo?: string, phone?: string }) {
    return this.prisma.driverMaster.create({
      data: { plantId, ...data }
    });
  }

  async deleteDriver(id: string) {
    return this.prisma.driverMaster.delete({ where: { id } });
  }

  // ===================== STAFF MASTER =====================
  async getStaff(plantId: string) {
    return this.prisma.staffMaster.findMany({ where: { plantId }, orderBy: { name: 'asc' } });
  }

  async createStaff(plantId: string, data: { name: string, role: string, phone?: string }) {
    return this.prisma.staffMaster.create({
      data: { plantId, ...data }
    });
  }

  async deleteStaff(id: string) {
    return this.prisma.staffMaster.delete({ where: { id } });
  }

  // ===================== LABOUR MASTER =====================
  async getLabour(plantId: string, page?: string, limit?: string) {
    const where = { plantId, isActive: true };
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      const [total, data] = await this.prisma.$transaction([
        this.prisma.labourMaster.count({ where }),
        this.prisma.labourMaster.findMany({ where, orderBy: { name: 'asc' }, skip, take: limitNum })
      ]);
      return { data, total };
    }
    return this.prisma.labourMaster.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createLabour(plantId: string, data: { name: string, type?: string, contact?: string }) {
    return this.prisma.labourMaster.create({
      data: { plantId, ...data }
    });
  }

  async deleteLabour(id: string) {
    return this.prisma.labourMaster.delete({ where: { id } });
  }
}

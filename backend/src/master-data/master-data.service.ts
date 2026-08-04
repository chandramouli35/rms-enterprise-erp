import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ===================== TRUCK MASTER =====================
  async getTrucks(plantId: string) {
    return this.prisma.truckMaster.findMany({ where: { plantId, isApproved: true }, orderBy: { truckNumber: 'asc' } });
  }

  async getAllTrucks(plantId: string) {
    return this.prisma.truckMaster.findMany({ where: { plantId }, orderBy: { createdAt: 'desc' } });
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
  async getLabour(plantId: string) {
    return this.prisma.labourMaster.findMany({ where: { plantId, isActive: true }, orderBy: { name: 'asc' } });
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

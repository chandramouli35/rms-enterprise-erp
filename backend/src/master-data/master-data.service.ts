import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Ensure you have these configured in your environment or substitute with valid credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  private async uploadImageToCloudinary(file: Express.Multer.File): Promise<string | null> {
    if (!file) return null;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'trucks' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url || null);
        }
      );
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

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

  async createTruck(plantId: string, data: { truckNumber: string, capacity?: number, isApproved?: boolean }, file?: Express.Multer.File) {
    const existing = await this.prisma.truckMaster.findFirst({
      where: { plantId, truckNumber: data.truckNumber }
    });
    
    if (existing) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException(`Truck number ${data.truckNumber} already exists in this plant`);
    }

    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await this.uploadImageToCloudinary(file);
    }
    
    // Convert capacity string to number if it's sent as FormData
    const capacityNum = data.capacity ? Number(data.capacity) : undefined;
    const isApprovedBool = typeof data.isApproved === 'string' ? data.isApproved === 'true' : data.isApproved;

    return this.prisma.truckMaster.create({
      data: { 
        plantId, 
        truckNumber: data.truckNumber,
        capacity: capacityNum,
        isApproved: isApprovedBool,
        imageUrl
      }
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

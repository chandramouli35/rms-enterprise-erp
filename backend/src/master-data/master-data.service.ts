import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FingerprintVerifyService } from '../auth/fingerprint-verify.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly fingerprintVerify: FingerprintVerifyService,
  ) {}

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

  /** Uppercase, strip spaces & special chars — prevents duplicate truck numbers. */
  normalizeTruckNumber(raw: string): string {
    return String(raw || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');
  }

  private isAdminRole(user: any) {
    const role = user?.role?.name || user?.role || '';
    return /SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(String(role));
  }

  private isSupervisorRole(user: any) {
    const role = user?.role?.name || user?.role || '';
    return /SUPERVISOR/i.test(String(role));
  }

  private assertValidFingerprint(biometricData: string | undefined, user: any) {
    const isAdmin = this.isAdminRole(user);
    if (isAdmin && (!biometricData || biometricData === 'ADMIN_BYPASS')) return;
    if (!biometricData || biometricData === 'ADMIN_BYPASS') {
      throw new BadRequestException(
        'Fingerprint scan is required to submit a new truck application.',
      );
    }
    if (
      !String(biometricData).includes('errCode="0"') &&
      !String(biometricData).includes("errCode='0'")
    ) {
      if (
        !String(biometricData).includes('<Pid') &&
        !String(biometricData).includes('<Resp') &&
        !/dc=|mi=|DeviceInfo|hmac/i.test(String(biometricData))
      ) {
        throw new BadRequestException('Invalid fingerprint capture — please scan again');
      }
    }
  }

  private async findTruckByNormalizedNumber(normalized: string, excludeId?: string) {
    if (!normalized) return null;
    const all = await this.prisma.truckMaster.findMany({
      select: { id: true, truckNumber: true, isApproved: true },
    });
    return (
      all.find(
        (t) =>
          t.id !== excludeId && this.normalizeTruckNumber(t.truckNumber) === normalized,
      ) || null
    );
  }

  /** Live duplicate check while typing truck number (normalized). */
  async checkTruckExists(truckNumber: string) {
    const normalized = this.normalizeTruckNumber(truckNumber);
    if (!normalized || normalized.length < 4) {
      return { exists: false, truckNumber: normalized || null };
    }
    const existing = await this.findTruckByNormalizedNumber(normalized);
    return {
      exists: !!existing,
      truckNumber: normalized,
      isApproved: existing?.isApproved ?? null,
    };
  }

  async getTrucks(plantId: string, page?: string, limit?: string) {
    const where = { isApproved: true };
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
    const where = {};
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

  async createTruck(
    plantId: string,
    data: {
      truckNumber: string;
      capacity?: number;
      isApproved?: boolean;
      transportCategory?: string;
      biometricData?: string;
      vehicleType?: string;
      readingUnit?: string;
    },
    file?: Express.Multer.File,
    user?: any,
  ) {
    const userId = user?.id;
    const isAdmin = this.isAdminRole(user);
    const isSupervisor = this.isSupervisorRole(user);

    if (isSupervisor) {
      this.assertValidFingerprint(data.biometricData, user);
    }

    const vehicleType = (data.vehicleType || '10W').toUpperCase();
    const allowedTypes = ['06W', '10W', '12W', '14W', 'TRACTOR', 'GENERATOR', 'CAR', 'BIKE'];
    if (!allowedTypes.includes(vehicleType)) {
      throw new BadRequestException(
        'Vehicle type must be 06W, 10W, 12W, 14W, TRACTOR, GENERATOR, CAR, or BIKE',
      );
    }
    const readingUnit = (data.readingUnit || 'KM').toUpperCase() === 'HRS' ? 'HRS' : 'KM';

    // Generator: manual name allowed; others: vehicle number (normalized)
    let truckNumber: string;
    if (vehicleType === 'GENERATOR') {
      truckNumber = String(data.truckNumber || '').trim();
      if (!truckNumber || truckNumber.length < 2) {
        throw new BadRequestException('Enter generator name (manual).');
      }
    } else {
      truckNumber = this.normalizeTruckNumber(data.truckNumber);
      if (!truckNumber || truckNumber.length < 4) {
        throw new BadRequestException('Enter a valid truck number (letters and digits only).');
      }
    }

    const existing = await this.findTruckByNormalizedNumber(
      vehicleType === 'GENERATOR' ? truckNumber.toUpperCase() : truckNumber,
    );
    if (existing) {
      throw new BadRequestException(
        `Truck / vehicle "${truckNumber}" already exists.`,
      );
    }

    let imageUrl: string | null = null;
    if (file && isAdmin) {
      imageUrl = await this.uploadImageToCloudinary(file);
    }

    const capacityNum = data.capacity ? Number(data.capacity) : undefined;
    const isApprovedBool =
      isSupervisor
        ? false
        : isAdmin
          ? typeof data.isApproved === 'string'
            ? data.isApproved === 'true'
            : data.isApproved !== false
          : false;

    const truck = await this.prisma.truckMaster.create({
      data: {
        plantId,
        truckNumber: vehicleType === 'GENERATOR' ? truckNumber : truckNumber,
        transportCategory: data.transportCategory || 'PARTY',
        capacity: capacityNum,
        isApproved: !!isApprovedBool,
        imageUrl,
        vehicleType,
        readingUnit,
      },
    });

    if (userId) {
      await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: isSupervisor ? 'TRUCK_APPLICATION_SUBMITTED' : 'AUTO_ADD_MASTER_DATA',
          module: 'Master Data',
          details: isSupervisor
            ? `Supervisor submitted truck application: ${truckNumber} (pending admin approval)`
            : `Added Truck: ${truckNumber}`,
        },
      });
    }

    if (isSupervisor) {
      const submitter =
        user?.fullName || user?.username || user?.name || 'Supervisor';
      const msg = `${submitter} submitted new truck application ${truckNumber} (${data.transportCategory || 'PARTY'}). Please confirm or decline.`;
      await this.prisma.notification.createMany({
        data: [
          { title: 'New Truck Application', message: msg, type: 'ALERT', role: 'SUPER_ADMIN' },
          { title: 'New Truck Application', message: msg, type: 'ALERT', role: 'PLANT_MANAGER' },
        ],
      });
    }

    return truck;
  }

  async approveTruck(id: string, userId?: string) {
    const truck = await this.prisma.truckMaster.update({
      where: { id },
      data: { isApproved: true },
    });
    if (userId) {
      await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: 'TRUCK_APPROVED',
          module: 'Master Data',
          details: `Approved truck: ${truck.truckNumber}`,
        },
      });
    }
    await this.prisma.notification.createMany({
      data: [
        {
          title: 'Truck Application Approved',
          message: `Truck ${truck.truckNumber} has been approved and is now available for use.`,
          type: 'INFO',
          role: 'SUPERVISOR',
        },
      ],
    });
    return truck;
  }

  async rejectTruck(id: string, userId?: string) {
    const truck = await this.prisma.truckMaster.findUnique({ where: { id } });
    if (!truck) throw new NotFoundException('Truck not found');
    await this.prisma.truckMaster.delete({ where: { id } });
    if (userId) {
      await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: 'TRUCK_REJECTED',
          module: 'Master Data',
          details: `Declined truck application: ${truck.truckNumber}`,
        },
      });
    }
    await this.prisma.notification.createMany({
      data: [
        {
          title: 'Truck Application Declined',
          message: `Truck application ${truck.truckNumber} was declined by Admin.`,
          type: 'WARNING',
          role: 'SUPERVISOR',
        },
      ],
    });
    return { success: true };
  }

  async deleteTruck(id: string) {
    return this.prisma.truckMaster.delete({ where: { id } });
  }

  // ===================== DRIVER MASTER =====================
  async getDrivers() {
    return this.prisma.driverMaster.findMany({ orderBy: { name: 'asc' } });
  }

  async createDriver(plantId: string, data: { name: string, licenseNo?: string, phone?: string }, userId?: string) {
    const driver = await this.prisma.driverMaster.create({
      data: { plantId, ...data }
    });
    if (userId) {
      await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: 'AUTO_ADD_MASTER_DATA',
          module: 'Master Data',
          details: `Auto-added Driver: ${data.name}`
        }
      });
    }
    return driver;
  }

  async deleteDriver(id: string) {
    return this.prisma.driverMaster.delete({ where: { id } });
  }

  async getFirstPlant() {
    return this.prisma.plant.findFirst();
  }

  async updateDriver(id: string, data: any) {
    return this.prisma.driverMaster.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(data.age && { age: parseInt(data.age) }),
      }
    });
  }

  // ===================== STAFF MASTER =====================
  async getStaff(plantId: string) {
    return this.prisma.staffMaster.findMany({ where: { plantId }, orderBy: { name: 'asc' } });
  }

  async createStaff(
    plantId: string,
    data: {
      name: string;
      role: string;
      phone?: string;
      fingerprint1?: string;
      fingerprint2?: string;
    },
    userId?: string,
  ) {
    const isUnloader = /UNLOADER/i.test(String(data.role || ''));
    if (isUnloader) {
      if (!data.fingerprint1 || !data.fingerprint2) {
        throw new BadRequestException(
          'Unloader registration requires two fingerprint scans (Finger 1 and Finger 2).',
        );
      }
      if (data.fingerprint1 === data.fingerprint2) {
        throw new BadRequestException(
          'Place another finger. Scan a different finger for Finger 1 and Finger 2.',
        );
      }
      await this.fingerprintVerify.assertEnrollmentPairNotDuplicate(
        data.fingerprint1,
        null,
        data.fingerprint2,
        null,
      );
    }

    const staff = await this.prisma.staffMaster.create({
      data: {
        plantId,
        name: data.name,
        role: data.role,
        phone: data.phone || null,
        fingerprint1: data.fingerprint1 || null,
        fingerprint2: data.fingerprint2 || null,
      },
    });
    if (userId) {
      await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: 'AUTO_ADD_MASTER_DATA',
          module: 'Master Data',
          details: `Auto-added Staff: ${data.name}${isUnloader ? ' (Unloader with fingerprints)' : ''}`,
        },
      });
    }
    return staff;
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

  async createLabour(plantId: string, data: { name: string, type?: string, contact?: string, firmName?: string }, userId?: string) {
    const labour = await this.prisma.labourMaster.create({
      data: { plantId, ...data }
    });
    if (userId) {
      await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: 'AUTO_ADD_MASTER_DATA',
          module: 'Master Data',
          details: `Auto-added Labour: ${data.name}`
        }
      });
    }
    return labour;
  }

  async deleteLabour(id: string) {
    return this.prisma.labourMaster.update({
      where: { id },
      data: { isActive: false }
    });
  }

  // ===================== PAHUNCH MASTER =====================
  async getPahunch(plantId: string, page?: string, limit?: string, allPlants = false) {
    const where: any = { isActive: true };
    if (!allPlants && plantId) where.plantId = plantId;
    if (page) {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;
      const [total, data] = await this.prisma.$transaction([
        this.prisma.pahunchMaster.count({ where }),
        this.prisma.pahunchMaster.findMany({ where, orderBy: { name: 'asc' }, skip, take: limitNum })
      ]);
      return { data, total };
    }
    return this.prisma.pahunchMaster.findMany({ where, orderBy: { name: 'asc' } });
  }

  async createPahunch(plantId: string, data: { name: string, contact?: string }, userId?: string) {
    const pahunch = await this.prisma.pahunchMaster.create({
      data: { plantId, ...data }
    });
    if (userId) {
      await this.prisma.systemAuditLog.create({
        data: {
          userId,
          action: 'AUTO_ADD_MASTER_DATA',
          module: 'Master Data',
          details: `Auto-added Pahunch Person: ${data.name}`
        }
      });
    }
    return pahunch;
  }

  async deletePahunch(id: string) {
    return this.prisma.pahunchMaster.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

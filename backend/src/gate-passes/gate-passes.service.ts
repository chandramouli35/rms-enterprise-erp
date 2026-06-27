import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GatePassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(plantId: string, userId: string, data: any) {
    // Retry loop for concurrency safety (optimistic locking pattern)
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
          const prefix = `GP-${dateStr}-`;

          // Find the latest gate pass for this plant today
          const lastPass = await tx.gatePass.findFirst({
            where: {
              plantId,
              passNumber: { startsWith: prefix }
            },
            orderBy: { passNumber: 'desc' },
          });

          let nextSeq = 1;
          if (lastPass) {
            const lastSeqStr = lastPass.passNumber.replace(prefix, '');
            const lastSeq = parseInt(lastSeqStr, 10);
            if (!isNaN(lastSeq)) {
              nextSeq = lastSeq + 1;
            }
          }

          const passNumber = `${prefix}${nextSeq.toString().padStart(4, '0')}`;

          return await tx.gatePass.create({
            data: {
              passNumber,
              vehicleNumber: data.vehicleNumber,
              driverName: data.driverName,
              driverLicense: data.driverLicense,
              source: data.source,
              supplierId: data.supplierId || null,
              estimatedBags: data.estimatedBags ? parseInt(data.estimatedBags, 10) : null,
              plantId,
              createdByUserId: userId,
              status: 'GENERATED',
            },
            include: { supplier: true }
          });
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('passNumber')) {
          retries++;
          if (retries >= MAX_RETRIES) {
            throw new ConflictException('Failed to generate unique Gate Pass number due to high concurrency. Please try again.');
          }
          continue;
        }
        throw error;
      }
    }
  }

  async findAll(plantId: string) {
    return this.prisma.gatePass.findMany({
      where: { plantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { supplier: true }
    });
  }

  async scanBarcode(plantId: string, barcode: string) {
    const gatePass = await this.prisma.gatePass.findFirst({
      where: { passNumber: barcode, plantId, deletedAt: null },
      include: { 
        supplier: true,
        qualityCheck: true,
        weighbridge: true
      }
    });

    if (!gatePass) {
      throw new NotFoundException('Gate Pass not found or belongs to another plant');
    }

    return gatePass;
  }
}

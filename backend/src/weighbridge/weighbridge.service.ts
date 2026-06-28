import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeighbridgeService {
  constructor(private readonly prisma: PrismaService) {}

  async captureWeight(plantId: string, user: any, data: any) {
    const { gatePassId, weight, isManualOverride, overrideReason, type } = data; // type: 'GROSS' | 'TARE'

    if (isManualOverride) {
      if (user.role !== 'PLANT_MANAGER' && user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Only Plant Manager or Super Admin can approve manual overrides');
      }
    }

    const gatePass = await this.prisma.gatePass.findFirst({
      where: { id: gatePassId, plantId, deletedAt: null }
    });

    if (!gatePass) throw new NotFoundException('Gate Pass not found');

    const existingTx = await this.prisma.weighbridgeTransaction.findUnique({
      where: { gatePassId }
    });

    if (type === 'GROSS') {
      if (existingTx?.grossWeight) {
        throw new BadRequestException('Gross weight already captured');
      }
      if (gatePass.status !== 'GENERATED') {
        throw new BadRequestException('Gate Pass must be in GENERATED status to capture Gross Weight');
      }

      await this.prisma.$transaction([
        this.prisma.weighbridgeTransaction.upsert({
          where: { gatePassId },
          create: {
            gatePassId,
            grossWeight: weight,
            grossTimestamp: new Date(),
            manualOverrideFlag: isManualOverride || false,
            overrideReason: isManualOverride ? overrideReason : null,
            approvedByUserId: isManualOverride ? user.id : null,
          },
          update: {
            grossWeight: weight,
            grossTimestamp: new Date(),
            manualOverrideFlag: isManualOverride || false,
            overrideReason: isManualOverride ? overrideReason : null,
            approvedByUserId: isManualOverride ? user.id : null,
          }
        }),
        this.prisma.gatePass.update({
          where: { id: gatePassId },
          data: { status: 'GROSS_WEIGHED' }
        })
      ]);
    } else if (type === 'TARE') {
      if (!existingTx || !existingTx.grossWeight) {
        throw new BadRequestException('Cannot capture Tare weight without Gross weight');
      }
      if (existingTx.tareWeight) {
        throw new BadRequestException('Tare weight already captured');
      }
      if (gatePass.status !== 'QC_PASSED') {
        throw new BadRequestException('Gate Pass must be QC_PASSED to capture Tare Weight');
      }

      const netWeight = existingTx.grossWeight - weight;
      if (netWeight <= 0) {
        throw new BadRequestException('Invalid weight: Tare cannot be greater than or equal to Gross');
      }

      await this.prisma.$transaction([
        this.prisma.weighbridgeTransaction.update({
          where: { gatePassId },
          data: {
            tareWeight: weight,
            netWeight,
            tareTimestamp: new Date(),
          }
        }),
        this.prisma.gatePass.update({
          where: { id: gatePassId },
          data: { status: 'TARE_WEIGHED' }
        }),
        // Add to ProcurementBatch
        this.prisma.procurementBatch.create({
          data: {
            plantId,
            gatePassId,
            grossWeight: existingTx.grossWeight,
            tareWeight: weight,
            netWeight,
            status: 'QC_APPROVED',
          }
        }),
        // Update or create Inventory
        this.prisma.inventoryItem.upsert({
          where: {
            plantId_itemType: { plantId, itemType: 'PADDY' }
          },
          create: {
            plantId,
            itemType: 'PADDY',
            itemCategory: 'RAW_MATERIAL',
            quantity: netWeight
          },
          update: {
            quantity: { increment: netWeight }
          }
        })
      ]);
    } else {
      throw new BadRequestException('Invalid capture type');
    }

    return { success: true };
  }
}

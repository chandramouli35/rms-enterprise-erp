import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  async savePurchase(data: any) {
    const { 
      plantId, supplierId, gatePassId, weighbridgeId, 
      netWeight, ratePerQuintal, transportCharges, otherCharges,
      moisture, broken, discoloration, foreignMatter, inspectedBy
    } = data;

    // Total Amount = (Net Weight in Quintals * ratePerQuintal) + transportCharges + otherCharges
    // Note: netWeight is in MT, 1 MT = 10 Quintals
    const netWeightQuintals = netWeight * 10;
    const baseAmount = netWeightQuintals * ratePerQuintal;
    const totalAmount = baseAmount + (transportCharges || 0) + (otherCharges || 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create ProcurementBatch
      const batch = await tx.procurementBatch.create({
        data: {
          plantId,
          supplierId,
          gatePassId,
          weighbridgeId,
          netWeight,
          amount: baseAmount,
          deductions: 0, // Simplified for now
          netAmount: totalAmount,
          status: 'COMPLETED',
        }
      });

      // 2. Save Quality Inspection
      await tx.qualityInspection.create({
        data: {
          procurementBatchId: batch.id,
          moisture,
          broken,
          discoloration,
          foreignMatter,
          status: 'APPROVED',
          inspectedBy
        }
      });

      // 3. Insert 'IN' record to StockLedger
      await tx.stockLedger.create({
        data: {
          plantId,
          transaction: 'IN',
          itemType: 'PADDY',
          quantity: netWeight,
          reference: batch.id
        }
      });

      return batch;
    });
  }
}
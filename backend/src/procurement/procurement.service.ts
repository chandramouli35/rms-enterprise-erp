import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  async savePurchase(data: any) {
    const { 
      plantId, supplierId, gatePassId, weighbridgeId, 
      netWeight, ratePerQuintal, transportCharges, otherCharges,
      moisture, broken, discoloration, foreignMatter, inspectedBy,
      category, purchaseType, bugs
    } = data;

    const parsedNetWeight = parseFloat(netWeight) || 0;
    const parsedRate = parseFloat(ratePerQuintal) || 0;
    const parsedTransport = parseFloat(transportCharges) || 0;
    const parsedOther = parseFloat(otherCharges) || 0;
    const parsedMoisture = parseFloat(moisture) || 0;
    const parsedBugs = parseFloat(bugs) || 0;
    
    let finalRate = parsedRate;
    
    // Boli Rate Calculation Engine
    if (purchaseType === 'PADDY_BOLI') {
      // Basic market calculation: penalize if moisture > 17
      let moistureDeduction = 0;
      if (parsedMoisture > 17) {
        moistureDeduction = (parsedMoisture - 17) * 10; // example: 10 INR per 1% extra moisture
      }
      let bugsDeduction = parsedBugs * 5; // example: 5 INR per 1% bugs
      
      finalRate = parsedRate - moistureDeduction - bugsDeduction;
    }

    // Total Amount = (Net Weight in Quintals * ratePerQuintal) + transportCharges + otherCharges
    // Note: netWeight is in MT, 1 MT = 10 Quintals
    const netWeightQuintals = parsedNetWeight * 10;
    const baseAmount = netWeightQuintals * finalRate;
    const totalAmount = baseAmount + parsedTransport + parsedOther;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create ProcurementBatch
      const batch = await tx.procurementBatch.create({
        data: {
          plantId,
          supplierId: supplierId || null,
          gatePassId: gatePassId || null,
          weighbridgeId: weighbridgeId || null,
          netWeight: parsedNetWeight,
          
          category: category || 'OPERATIONAL',
          purchaseType: purchaseType || 'PADDY_NORMAL',
          baseRate: parsedRate,
          finalRate: finalRate,
          
          amount: baseAmount,
          deductions: parsedRate - finalRate, // Tracking the rate deduction
          netAmount: totalAmount,
          status: 'PENDING',
        }
      });

      // 2. Save Quality Inspection
      await tx.qualityInspection.create({
        data: {
          procurementBatchId: batch.id,
          moisture: parseFloat(moisture) || 0,
          broken: parseFloat(broken) || 0,
          discoloration: parseFloat(discoloration) || 0,
          foreignMatter: parseFloat(foreignMatter) || 0,
          status: 'PENDING',
          inspectedBy: inspectedBy || null
        }
      });

      // 3. Insert 'IN' record to StockLedger
      await tx.stockLedger.create({
        data: {
          plantId,
          transaction: 'IN',
          itemType: 'PADDY',
          quantity: parsedNetWeight,
          reference: batch.id
        }
      });

      // 4. Save Advanced Inward Details (BEAS AGRO)
      await tx.paddyInwardDetails.create({
        data: {
          procurementBatchId: batch.id,
          gpNo: data.gpNo,
          mandiEgNo: data.mandiEgNo,
          rstNo: data.rstNo,
          pahunchPersonName: data.pahunchPersonName,
          safaiType: data.safaiType,
          allocationType: data.allocationType,
          originalBardanaClass: data.originalBardanaClass,
          agencyGpBardanaClass: data.agencyGpBardanaClass,
          bagsRecAtMill: parseFloat(data.bagsRecAtMill) || 0,
          bagsAtAgencyGp: parseFloat(data.bagsAtAgencyGp) || 0,
          netWtAtMill: parseFloat(data.netWtAtMill) || 0,
          requiredNetWt: parseFloat(data.requiredNetWt) || 0,
          netWtDifference: parseFloat(data.netWtDifference) || 0,
          netWtAtParty: parseFloat(data.netWtAtParty) || 0,
          shortageType: data.shortageType,
        }
      });

      // 5. If Boli, create PaddySodaPending for Hisab tracking
      if (purchaseType === 'PADDY_BOLI' && supplierId) {
        await tx.paddySodaPending.create({
          data: {
            plantId,
            supplierId,
            moisture: parsedMoisture,
            bags: parseFloat(data.bagsRecAtMill) || 0,
            rate: finalRate,
            diff: parsedRate - finalRate,
            payment: 0,
            finalHisabAmt: baseAmount,
            note: 'Initial Entry'
          }
        });
      }

      return batch;
    });
  }

  async getRecentPurchases(plantId: string) {
    const batches = await this.prisma.procurementBatch.findMany({
      where: { plantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        supplier: true,
        quality: true,
        weighbridge: true
      }
    });

    return batches.map((b: any) => ({
      purchaseNo: b.id.substring(0, 18),
      date: b.createdAt.toISOString().replace('T', ' ').substring(0, 16),
      supplier: b.supplier?.name || b.weighbridge?.supplierName || 'Unknown',
      vehicle: b.weighbridge?.vehicleNo || '-',
      netWeight: b.netWeight,
      moisture: b.quality?.moisture || 0,
      rate: (b.amount / (b.netWeight * 10)) || 0,
      amount: b.netAmount,
      status: b.status,
      qcStatus: b.quality?.status || 'Pending'
    }));
  }

  async getBatch(batchId: string) {
    return this.prisma.procurementBatch.findFirst({
      where: { id: { startsWith: batchId } },
      include: { supplier: true, weighbridge: true, quality: true }
    });
  }

  async updateQuality(batchId: string, data: any) {
    const { moisture, broken, discoloration, foreignMatter, chalky, others, remarks, inspectedBy, status } = data;

    const batch = await this.prisma.procurementBatch.findFirst({
      where: { id: { startsWith: batchId } },
      select: { id: true }
    });

    if (!batch) {
      throw new Error('Batch not found for quality update.');
    }

    const fullBatchId = batch.id;

    return this.prisma.$transaction(async (tx) => {
      const qc = await tx.qualityInspection.update({
        where: { procurementBatchId: fullBatchId },
        data: {
          moisture: parseFloat(moisture) || 0,
          broken: parseFloat(broken) || 0,
          discoloration: parseFloat(discoloration) || 0,
          foreignMatter: parseFloat(foreignMatter) || 0,
          status: status, // 'APPROVED' or 'REJECTED'
          inspectedBy: inspectedBy || null
        }
      });

      const batchStatus = status === 'APPROVED' ? 'COMPLETED' : 'QC_REJECTED';
      await tx.procurementBatch.update({
        where: { id: fullBatchId },
        data: { status: batchStatus }
      });

      return qc;
    });
  }

  async getSuppliers() {
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createSupplier(data: { name: string; contact?: string; email?: string; address?: string }) {
    return this.prisma.supplier.create({
      data: {
        ...data,
        status: 'Active'
      }
    });
  }

  async getAnalytics(plantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalSuppliers, monthPurchases, monthAmount, pendingQty, todayPurchase] = await Promise.all([
      this.prisma.supplier.count({ where: { status: 'Active' } }),
      
      this.prisma.procurementBatch.aggregate({
        where: { plantId, createdAt: { gte: startOfMonth } },
        _sum: { netWeight: true }
      }),
      
      this.prisma.procurementBatch.aggregate({
        where: { plantId, createdAt: { gte: startOfMonth } },
        _sum: { netAmount: true }
      }),

      this.prisma.procurementBatch.aggregate({
        where: { plantId, status: 'PENDING' },
        _sum: { netWeight: true }
      }),

      this.prisma.procurementBatch.aggregate({
        where: { plantId, createdAt: { gte: startOfDay } },
        _sum: { netWeight: true }
      })
    ]);

    return {
      totalSuppliers,
      totalPurchaseMT: monthPurchases._sum.netWeight || 0,
      totalAmount: monthAmount._sum.netAmount || 0,
      pendingQtyMT: pendingQty._sum.netWeight || 0,
      todayPurchaseMT: todayPurchase._sum.netWeight || 0
    };
  }

  async getPurchaseRegister(plantId: string, filters: any) {
    const { startDate, endDate, supplierId, status } = filters;
    const where: any = { plantId };

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: new Date(startDate), lte: end };
    }
    
    if (supplierId && supplierId !== 'All Suppliers') {
      where.supplierId = supplierId;
    }

    if (status && status !== 'All Status') {
      where.status = status;
    }

    const batches = await this.prisma.procurementBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { supplier: true, quality: true, weighbridge: true }
    });

    return batches.map((b: any) => ({
      id: b.id,
      purchaseNo: b.id.substring(0, 18),
      date: b.createdAt.toISOString().replace('T', ' ').substring(0, 10),
      supplier: b.supplier?.name || b.weighbridge?.supplierName || 'Unknown',
      netWeight: b.netWeight,
      amount: b.netAmount,
      status: b.status
    }));
  }

  // Next-Day Correction Guard
  async updateBoliRate(batchId: string, newRate: number, arhtiaCorrection: number) {
    const batch = await this.prisma.procurementBatch.findUnique({
      where: { id: batchId }
    });

    if (!batch) throw new BadRequestException('Batch not found');
    if (batch.purchaseType !== 'PADDY_BOLI') throw new BadRequestException('Can only update rates for Boli purchases');
    if (!batch.baseRate) throw new BadRequestException('Base rate not found for this batch');

    // Strict validation: variance cannot exceed 20% of base rate
    const variance = Math.abs(batch.baseRate - newRate);
    const maxAllowedVariance = batch.baseRate * 0.20;

    if (variance > maxAllowedVariance) {
      throw new BadRequestException(`Rate correction exceeds maximum allowed 20% variance. Max allowed variance is ${maxAllowedVariance}.`);
    }

    return this.prisma.procurementBatch.update({
      where: { id: batchId },
      data: {
        finalRate: newRate,
        arhtiaCorrection,
        nextDayCorrection: variance
      }
    });
  }

  // Paddy Soda Pending Aggregate Endpoint
  async getSodaPending(plantId: string) {
    // We group by supplier and aggregate the pending diffs
    const pending = await this.prisma.paddySodaPending.findMany({
      where: { plantId },
      include: { supplier: true },
      orderBy: { date: 'desc' }
    });
    
    return pending.map(p => ({
      id: p.id,
      partyMandi: p.supplier.name,
      date: p.date,
      mc: p.moisture,
      bags: p.bags,
      rate: p.rate,
      diff: p.diff,
      payment: p.payment,
      note: p.note,
      finalHisabAmt: p.finalHisabAmt
    }));
  }

  async settleHisab(data: { id: string; payment: number; note: string; finalHisabAmt: number; userId?: string }) {
    return await this.prisma.$transaction(async (tx) => {
      const pending = await tx.paddySodaPending.findUnique({
        where: { id: data.id },
        include: { supplier: true }
      });

      if (!pending) {
        throw new Error('Pending Hisab record not found');
      }

      // 1. Update the pending record
      const updated = await tx.paddySodaPending.update({
        where: { id: data.id },
        data: {
          payment: data.payment,
          note: data.note,
          finalHisabAmt: data.finalHisabAmt
        }
      });

      // 2. Log in SystemAuditLog to maintain ledger audit trail
      if (data.userId) {
        await tx.systemAuditLog.create({
          data: {
            userId: data.userId,
            action: 'SETTLE_HISAB',
            module: 'Procurement',
            details: `Settled Hisab for Supplier: ${pending.supplier.name}. Payment: ${data.payment}, Final Hisab Amt: ${data.finalHisabAmt}, Notes: ${data.note}`
          }
        });
      }

      return updated;
    });
  }
}
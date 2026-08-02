import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService, private inventoryService: InventoryService) {}

  async savePurchase(data: any) {
    const { 
      plantId, supplierId, gatePassId, weighbridgeId, 
      netWeight, ratePerQuintal, transportCharges, otherCharges,
      moisture, broken, discoloration, foreignMatter, inspectedBy,
      category, purchaseType, bugs, godown, biometricData
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

    // Phase 4: Chronological Enforcements (RST and Mandi Parchi)
    const incomingRstNum = data.rstNo ? parseInt(data.rstNo.replace(/\D/g, ''), 10) : null;
    const incomingMandiNum = (data.mandiEgpNo || data.mandiEgNo) ? parseInt((data.mandiEgpNo || data.mandiEgNo).replace(/\D/g, ''), 10) : null;

    if (incomingRstNum || incomingMandiNum) {
      // Get the latest inward details for this plant
      const latestInward = await this.prisma.paddyInwardDetails.findFirst({
        where: {
          procurementBatch: {
            plantId: plantId
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (latestInward) {
        if (incomingRstNum && latestInward.rstNo) {
          const latestRstNum = parseInt(latestInward.rstNo.replace(/\D/g, ''), 10);
          if (!isNaN(latestRstNum) && !isNaN(incomingRstNum)) {
            if (incomingRstNum <= latestRstNum) {
              throw new BadRequestException(`RST Number must be in chronological sequence. Incoming: ${data.rstNo}, Last Saved: ${latestInward.rstNo}`);
            }
          }
        }
        
        if (incomingMandiNum && latestInward.mandiEgNo) {
          const latestMandiNum = parseInt(latestInward.mandiEgNo.replace(/\D/g, ''), 10);
          if (!isNaN(latestMandiNum) && !isNaN(incomingMandiNum)) {
            if (incomingMandiNum <= latestMandiNum) {
              throw new BadRequestException(`Mandi e-GP Number must be in chronological sequence. Incoming: ${data.mandiEgpNo || data.mandiEgNo}, Last Saved: ${latestInward.mandiEgNo}`);
            }
          }
        }
        
        const incomingParchiNum = data.mandiParchiNo ? parseInt(data.mandiParchiNo.replace(/\D/g, ''), 10) : null;
        if (incomingParchiNum && latestInward.mandiParchiNo) {
          const latestParchiNum = parseInt(latestInward.mandiParchiNo.replace(/\D/g, ''), 10);
          if (!isNaN(latestParchiNum) && !isNaN(incomingParchiNum)) {
            if (incomingParchiNum <= latestParchiNum) {
              throw new BadRequestException(`Mandi Parchi Number must be in chronological sequence. Incoming: ${data.mandiParchiNo}, Last Saved: ${latestInward.mandiParchiNo}`);
            }
          }
        }
      }
    }

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
          biometricData: biometricData || null,
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

      // 3. Update Inventory and Ledger
      await this.inventoryService.adjustStock({
        plantId,
        itemType: 'PADDY',
        quantityChange: parsedNetWeight,
        transactionType: 'IN',
        referenceId: batch.id,
        remarks: `Purchase entry ${batch.id.substring(0, 8)}`,
        godown: godown || data.stackNo || 'Main Yard', // Fallback to stackNo or Main Yard
        category: category || 'OPERATIONAL',
        stockValueChange: totalAmount
      });

      // 4. Save Advanced Inward Details (BEAS AGRO)
      await tx.paddyInwardDetails.create({
        data: {
          procurementBatchId: batch.id,
          truckNo: data.truckNo,
          gpNo: data.gpNo,
          mandiEgNo: data.mandiEgpNo || data.mandiEgNo,
          mandi: data.mandi,
          rstNo: data.rstNo,
          mandiParchiNo: data.mandiParchiNo,
          pahunchPersonName: data.pahunchPersonName,
          safaiType: data.safaiType,
          allocationType: data.allocationType,
          stackNo: data.stackNo,
          bagType: data.bagType,
          originalBardanaClass: data.originalBardanaClass,
          agencyGpBardanaClass: data.agencyGpBardanaClass,
          bagsRecAtMill: parseFloat(data.bagsRecAtMill) || 0,
          bagsAtAgencyGp: parseFloat(data.bagsAtAgencyGp) || 0,
          netWtAtMill: parseFloat(data.netWtAtMill) || 0,
          requiredNetWt: parseFloat(data.requiredNetWt) || 0,
          netWtDifference: parseFloat(data.netWtDifference) || 0,
          netWtAtParty: parseFloat(data.netWtAtParty) || 0,
          shortageType: data.shortageType,
          shortageAClass: parseFloat(data.shortageAClass) || 0,
          shortageBClass: parseFloat(data.shortageBClass) || 0,
          qualityCutType: data.qualityCutType || 'NONE',
          qualityCutValue: parseFloat(data.qualityCutValue) || 0,
          qualityCutReason: data.qualityCutReason || null,
          
          // Shortage Hisab Fields
          standardBagWeight: data.standardBagWeight ? parseFloat(data.standardBagWeight) : null,
          totalBagsCalculated: data.totalBagsCalculated ? parseFloat(data.totalBagsCalculated) : null,
          standardWeightCalculated: data.standardWeightCalculated ? parseFloat(data.standardWeightCalculated) : null,
          actualWeightReceived: data.actualWeightReceived ? parseFloat(data.actualWeightReceived) : null,
          shortageQtl: data.shortageQtl ? parseFloat(data.shortageQtl) : null,
          shortageBags: data.shortageBags ? parseFloat(data.shortageBags) : null,

          // Bardana Hisab Fields
          aClassGiven: data.aClassGiven ? parseFloat(data.aClassGiven) : null,
          aClassReceived: data.aClassReceived ? parseFloat(data.aClassReceived) : null,
          aClassPending: data.aClassPending ? parseFloat(data.aClassPending) : null,
          bClassGiven: data.bClassGiven ? parseFloat(data.bClassGiven) : null,
          bClassReceived: data.bClassReceived ? parseFloat(data.bClassReceived) : null,
          bClassPending: data.bClassPending ? parseFloat(data.bClassPending) : null,
          autoConvertedToBClass: data.autoConvertedToBClass ? parseFloat(data.autoConvertedToBClass) : null,
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
            finalHisabAmt: (parseFloat(data.bagsRecAtMill) || 0) * 0.375 * (parsedRate - finalRate),
            note: 'Initial Entry'
          }
        });
      }

      // 6. Process Supervisor Boli Inputs
      if (data.boliInputs && Object.keys(data.boliInputs).length > 0) {
        for (const [boliId, bagsRec] of Object.entries(data.boliInputs)) {
          const received = parseFloat(bagsRec as string);
          if (received > 0) {
            const boli = await tx.paddyBoli.findUnique({ where: { id: boliId } });
            if (boli) {
              const newTotal = boli.bagsReceived + received;
              const isCompleted = newTotal >= (boli.bags * 0.98); // 2% tolerance logic
              await tx.paddyBoli.update({
                where: { id: boliId },
                data: { bagsReceived: newTotal, isCompleted }
              });
            }
          }
        }
      }

      // 7. Notification for Quality Cut > 1%
      if (data.qualityCutType === 'PERCENTAGE' && parseFloat(data.qualityCutValue) > 1) {
        await tx.systemAuditLog.create({
          data: {
            action: 'MANDI_QUALITY_NOTIFICATION',
            module: 'PROCUREMENT',
            entityId: batch.id,
            details: `Quality cut of ${data.qualityCutValue}% exceeded 1% for Mandi ${data.mandi || data.mandiEgpNo}. Please review.`,
            userId: 'SYSTEM',
            plantId: plantId
          }
        });
      }

      return batch;
    });
  }


  async getInwards(plantId: string, dateFrom?: string, dateTo?: string) {
    const whereClause: any = plantId === 'global' ? {} : { plantId };
    
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = to;
      }
    }

    const inwards = await this.prisma.procurementBatch.findMany({
      where: {
        ...whereClause,
        
      },
      include: {
        supplier: true,
        paddyInwardDetails: true,
        weighbridge: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return inwards.map(b => ({
      id: b.id,
      purchaseNo: b.id.substring(0, 8).toUpperCase(),
      date: b.createdAt.toISOString().split('T')[0],
      gpNo: b.paddyInwardDetails?.gpNo || '-',
      supplier: b.supplier?.name || 'Walk-in',
      mandiEgNo: b.paddyInwardDetails?.mandiEgNo || '-',
      rstNo: b.paddyInwardDetails?.rstNo || '-',
      vehicleNo: b.weighbridge?.vehicleNo || b.paddyInwardDetails?.truckNo || '-',
      grossWt: b.grossWeight || '-',
      tareWt: b.tareWeight || '-',
      netWt: b.netWeight || b.paddyInwardDetails?.netWtAtParty || b.paddyInwardDetails?.netWtAtMill || '-',    }));
  }

  
  async getInwardDetails(batchId: string) {
    const batch = await this.prisma.procurementBatch.findUnique({
      where: { id: batchId },
      include: {
        supplier: true,
        paddyInwardDetails: true,
        weighbridge: true,
        quality: true,
      }
    });
    if (!batch) throw new Error('Inward record not found');
    return batch;
  }

  async getRecentPurchases(plantId: string, dateFrom?: string, dateTo?: string) {
    const whereClause: any = plantId === 'global' ? {} : { plantId };
    
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = to;
      }
    }

    const batches = await this.prisma.procurementBatch.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: dateFrom || dateTo ? 100 : 5, // Increase limit if filtering by date
      include: {
        supplier: true,
        quality: true,
        weighbridge: true,
        paddyInwardDetails: true
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
      qcStatus: b.quality?.status || 'Pending',
      inwardDetails: b.paddyInwardDetails || null
    }));
  }

  async getBatch(batchId: string) {
    return this.prisma.procurementBatch.findFirst({
      where: { id: { startsWith: batchId } },
      include: { supplier: true, weighbridge: true, quality: true, paddyInwardDetails: true }
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

  async createSupplier(data: { name: string; contact?: string; email?: string; address?: string; firmNames?: string[]; mandi?: string }) {
    const { name, contact, email, address, firmNames, mandi } = data;
    return this.prisma.supplier.create({
      data: {
        name,
        contact,
        email,
        address,
        firmNames: firmNames || [],
        mandi,
        status: 'Active'
      }
    });
  }

  async getOccupiedStacks(plantId: string) {
    const batches = await this.prisma.paddyInwardDetails.findMany({
      where: {
        stackNo: { not: null },
        procurementBatch: { plantId, category: 'OPERATIONAL' }
      },
      include: {
        procurementBatch: {
          include: { quality: true }
        }
      }
    });

    const stackMap: Record<string, any> = {};

    batches.forEach(b => {
      const stack = b.stackNo;
      if (!stack) return;

      if (!stackMap[stack]) {
        stackMap[stack] = {
          bags: 0,
          totalMoisture: 0,
          moistureCount: 0,
          maxMoisture: 0,
          minMoisture: 999,
          type: b.bagType || 'NEW',
          capacity: 2467,
          moisture: 0
        };
      }

      stackMap[stack].bags += b.bagsRecAtMill || 0;
      
      const m = b.procurementBatch?.quality?.moisture;
      if (m) {
        stackMap[stack].totalMoisture += m;
        stackMap[stack].moistureCount += 1;
        if (m > stackMap[stack].maxMoisture) stackMap[stack].maxMoisture = m;
        if (m < stackMap[stack].minMoisture) stackMap[stack].minMoisture = m;
      }
    });

    Object.keys(stackMap).forEach(key => {
      if (stackMap[key].moistureCount > 0) {
        stackMap[key].moisture = Number((stackMap[key].totalMoisture / stackMap[key].moistureCount).toFixed(2));
      } else {
        stackMap[key].minMoisture = 0;
      }
      if (stackMap[key].minMoisture === 999) stackMap[key].minMoisture = 0;
      
      delete stackMap[key].totalMoisture;
      delete stackMap[key].moistureCount;
    });

    return stackMap;
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
      include: { supplier: true, quality: true, weighbridge: true, paddyInwardDetails: true }
    });

    return batches.map((b: any) => ({
      id: b.id,
      purchaseNo: b.id.substring(0, 18),
      date: b.createdAt.toISOString().replace('T', ' ').substring(0, 10),
      supplier: b.supplier?.name || b.weighbridge?.supplierName || 'Unknown',
      netWeight: b.netWeight,
      amount: b.netAmount,
      status: b.status,
      inwardDetails: b.paddyInwardDetails || null
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
  async getSodaPending(plantId: string, dateFrom?: string, dateTo?: string) {
    // We group by supplier and aggregate the pending diffs
    const whereClause: any = plantId === 'global' ? {} : { plantId };
    
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        whereClause.date.lte = to;
      }
    }

    const pending = await this.prisma.paddySodaPending.findMany({
      where: whereClause,
      include: { supplier: true, bolis: true },
      orderBy: { date: 'desc' }
    });
    
    return pending.map(p => ({
      id: p.id,
      supplierId: p.supplierId,
      partyMandi: p.supplier.name,
      date: p.date,
      mc: p.moisture,
      bags: p.bags,
      rate: p.rate,
      bolis: p.bolis,
      diff: p.diff,
      payment: p.payment,
      note: p.note,
      finalHisabAmt: p.finalHisabAmt,
      riceCategory: p.riceCategory
    }));
  }

  async createSodaPending(data: any) {
    const bolisData = data.bolis && Array.isArray(data.bolis) && data.bolis.length > 0 ? data.bolis : [
      { moisture: parseFloat(data.moisture) || 0, bags: parseFloat(data.bags) || 0, rate: parseFloat(data.rate) || 0 }
    ];

    const totalBags = bolisData.reduce((sum: number, b: any) => sum + (parseFloat(b.bags) || 0), 0);
    const avgMoisture = bolisData.reduce((sum: number, b: any) => sum + (parseFloat(b.moisture) || 0), 0) / (bolisData.length || 1);
    const avgRate = bolisData.reduce((sum: number, b: any) => sum + (parseFloat(b.rate) || 0), 0) / (bolisData.length || 1);

    return this.prisma.paddySodaPending.create({
      data: {
        plantId: data.plantId,
        supplierId: data.supplierId,
        date: data.date ? new Date(data.date) : new Date(),
        moisture: avgMoisture,
        bags: totalBags,
        rate: avgRate,
        govtRate: parseFloat(data.govtRate) || 0,
        diff: parseFloat(data.diff) || 0,
        payment: parseFloat(data.payment) || 0,
        finalHisabAmt: data.finalHisabAmt ? parseFloat(data.finalHisabAmt) : (totalBags * 0.375 * (parseFloat(data.diff) || 0)),
        note: data.note || '',
        riceCategory: data.riceCategory || 'ANY',
        bolis: {
          create: bolisData.map((b: any) => ({
            moisture: parseFloat(b.moisture) || 0,
            bags: parseFloat(b.bags) || 0,
            rate: parseFloat(b.rate) || 0
          }))
        }
      }
    });
  }

  async updateSodaPending(id: string, data: any) {
    const bolisData = data.bolis && Array.isArray(data.bolis) && data.bolis.length > 0 ? data.bolis : [
      { moisture: parseFloat(data.moisture) || 0, bags: parseFloat(data.bags) || 0, rate: parseFloat(data.rate) || 0 }
    ];

    const totalBags = bolisData.reduce((sum: number, b: any) => sum + (parseFloat(b.bags) || 0), 0);
    const avgMoisture = bolisData.reduce((sum: number, b: any) => sum + (parseFloat(b.moisture) || 0), 0) / (bolisData.length || 1);
    const avgRate = bolisData.reduce((sum: number, b: any) => sum + (parseFloat(b.rate) || 0), 0) / (bolisData.length || 1);

    await this.prisma.paddyBoli.deleteMany({ where: { sodaPendingId: id } });

    return this.prisma.paddySodaPending.update({
      where: { id },
      data: {
        plantId: data.plantId,
        supplierId: data.supplierId,
        date: data.date ? new Date(data.date) : undefined,
        moisture: avgMoisture,
        bags: totalBags,
        rate: avgRate,
        govtRate: parseFloat(data.govtRate) || 0,
        diff: parseFloat(data.diff) || 0,
        payment: parseFloat(data.payment) || 0,
        finalHisabAmt: data.finalHisabAmt ? parseFloat(data.finalHisabAmt) : (totalBags * 0.375 * (parseFloat(data.diff) || 0)),
        note: data.note || '',
        riceCategory: data.riceCategory || 'ANY',
        bolis: {
          create: bolisData.map((b: any) => ({
            moisture: parseFloat(b.moisture) || 0,
            bags: parseFloat(b.bags) || 0,
            rate: parseFloat(b.rate) || 0
          }))
        }
      }
    });
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
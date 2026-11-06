import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { FinanceSodaService } from '../finance/finance-soda.service';
import { FinanceSalePurchaseService } from '../finance/finance-sale-purchase.service';
import { ProcurementService } from '../procurement/procurement.service';
import { LabourWorkService } from '../labour-work/labour-work.service';

@Injectable()
export class GatePassService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    @Inject(forwardRef(() => FinanceSodaService))
    private financeSodaService: FinanceSodaService,
    @Inject(forwardRef(() => FinanceSalePurchaseService))
    private salePurchaseService: FinanceSalePurchaseService,
    private procurementService: ProcurementService,
    private labourWork: LabourWorkService,
  ) {}

  /** Enforce minimum 30 minutes between GP In (start) and GP Out (complete). */
  private assertMinGpInOutGap(start: Date | string, end: Date | string) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e)) {
      throw new BadRequestException('Invalid GP In / GP Out date-time.');
    }
    if (e < s) {
      throw new BadRequestException('GP Out (Complete) cannot be prior to GP In (Entry).');
    }
    const gapMins = (e - s) / (60 * 1000);
    if (gapMins < 30) {
      throw new BadRequestException(
        'Minimum 30-minute gap required between GP In and GP Out.',
      );
    }
  }

  /**
   * Feedback 28: notify only when GP has Operational inventory/product items
   * (Non-Operational alone must not trigger missing-soda notify).
   */
  private async hasOperationalGatePassItems(items: any[] | undefined, material?: string) {
    const names = new Set<string>();
    for (const it of items || []) {
      const n = String(it?.itemName || '').trim();
      if (n) names.add(n);
    }
    const mat = String(material || '').trim();
    if (mat) names.add(mat);
    if (!names.size) return false;

    const nameList = [...names];
    const products = await this.prisma.product.findMany({
      where: {
        OR: nameList.map((n) => ({ name: { equals: n, mode: 'insensitive' as const } })),
      },
      select: { name: true, category: true },
    });

    const matched = new Set(products.map((p) => p.name.toLowerCase()));
    const isOp = (cat?: string | null) => {
      const c = String(cat || 'OPERATIONAL').trim().toUpperCase().replace(/[-\s]/g, '_');
      return c === 'OPERATIONAL' || c === '';
    };

    if (products.some((p) => isOp(p.category))) return true;

    // Inventory variety / itemType fallback
    const inventories = await this.prisma.inventory.findMany({
      where: {
        OR: [
          ...nameList.map((n) => ({ variety: { equals: n, mode: 'insensitive' as const } })),
          ...nameList.map((n) => ({ itemType: { equals: n, mode: 'insensitive' as const } })),
        ],
      },
      select: { category: true, variety: true, itemType: true },
      take: 50,
    });
    if (inventories.some((inv) => isOp(inv.category))) return true;

    // Unmatched free-text items: treat as operational (finance core — don't miss notify)
    const anyUnmatched = nameList.some((n) => !matched.has(n.toLowerCase()));
    return anyUnmatched;
  }

  async generateGatePass(data: any) {
    const { 
      plantId, passType, vehicleNo, vehicleType, purpose, 
      supplierId, driverName, contactNo, 
      challanNo, grossWeight, tareWeight, netWeight,
      emptyVideoTime, loadedVideoTime, partyName, ntWtParty, sodaNo, remarks,
      previousTruckReading, newTruckReading, kmsDriven, meterNotWorking, gstNo,
      // Legacy fields
      material, noOfBags,
      // New fields
      rstNo, gpStartDate, gpCompleteDate, isCompleteDateNA, weighbridgeActive, mainBags, shortageBags, isDraft, items,
      // Transfer Entry fields
      isTransfer, deliveryAtId, recipientPlantId,
      // Feedback 28
      financeSodaId, financeSodaNA, billNo, billNoNA, bagTypeGp,
    } = data;
    
    // Min 30-minute gap between GP In (start) and GP Out (complete) when complete is set
    if (!isCompleteDateNA && gpStartDate && gpCompleteDate) {
      this.assertMinGpInOutGap(gpStartDate, gpCompleteDate);
    }
    
    // Feedback 33 — global truck constraints (all mills):
    // 1) No new GP while truck has ACTIVE GP anywhere
    // 2) No new GP while truck is DRAFT/PENDING/ACTIVE/UNLOADING on Paddy Inward anywhere
    // 3) Min 2-hour gap after last completed GP or completed Paddy Inward trip
    const truckKey = String(vehicleNo || '').trim();
    if (truckKey) {
      const activeGp = await this.prisma.gatePass.findFirst({
        where: {
          vehicleNo: { equals: truckKey, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (activeGp) {
        await this.prisma.duplicateGatePassLog.create({
          data: {
            plantId: plantId || activeGp.plantId,
            vehicleNo: truckKey,
            attemptedType: passType || 'INWARD',
            reason: `Vehicle already has an active GP (${activeGp.qrCode || activeGp.id}) at plant ${activeGp.plantId}`,
          },
        });
        throw new ConflictException(
          `Truck ${truckKey} already has an active Gate Pass globally. Complete that trip before cutting a new GP.`,
        );
      }

      const activeInward = await this.prisma.paddyInwardDetails.findFirst({
        where: {
          truckNo: { equals: truckKey, mode: 'insensitive' },
          procurementBatch: {
            status: { in: ['DRAFT', 'PENDING', 'ACTIVE', 'UNLOADING'] },
          },
        },
        include: { procurementBatch: { select: { status: true, plantId: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (activeInward) {
        throw new ConflictException(
          `Truck ${truckKey} is actively unloading (status ${activeInward.procurementBatch?.status}) at another/same mill. Finish that inward first.`,
        );
      }

      const twoHoursMs = 2 * 60 * 60 * 1000;
      const lastCompletedGp = await this.prisma.gatePass.findFirst({
        where: {
          vehicleNo: { equals: truckKey, mode: 'insensitive' },
          status: 'COMPLETED',
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (lastCompletedGp) {
        const completedAt = lastCompletedGp.updatedAt || lastCompletedGp.createdAt;
        if (Date.now() - new Date(completedAt).getTime() < twoHoursMs) {
          throw new BadRequestException(
            `Truck ${truckKey} completed a Gate Pass less than 2 hours ago. Minimum 2-hour gap required before a new trip.`,
          );
        }
      }

      const lastCompletedInward = await this.prisma.paddyInwardDetails.findFirst({
        where: {
          truckNo: { equals: truckKey, mode: 'insensitive' },
          procurementBatch: {
            status: { in: ['CONFIRMED', 'COMPLETED'] },
          },
        },
        include: { procurementBatch: { select: { updatedAt: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      if (lastCompletedInward) {
        const completedAt =
          lastCompletedInward.procurementBatch?.updatedAt ||
          lastCompletedInward.updatedAt ||
          lastCompletedInward.createdAt;
        if (Date.now() - new Date(completedAt).getTime() < twoHoursMs) {
          throw new BadRequestException(
            `Truck ${truckKey} completed a Paddy Inward trip less than 2 hours ago. Minimum 2-hour gap required before a new trip.`,
          );
        }
      }
    }
    
    const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
    const year = new Date().getFullYear();

    // Get all tickets for the passType this year across ALL plants to find the true max sequence
    // This is required because qrCode has a global @unique constraint in the database
    const allPasses = await this.prisma.gatePass.findMany({
      where: { 
        passType,
        qrCode: { startsWith: `${prefix}-${year}-` }
      },
      select: { qrCode: true }
    });
    
    let lastSeq = 0;
    for (const p of allPasses) {
      if (!p.qrCode) continue;
      const parts = p.qrCode.split('-');
      if (parts.length === 3) {
        const seqNum = parseInt(parts[2], 10);
        if (!isNaN(seqNum) && seqNum > lastSeq) {
          lastSeq = seqNum;
        }
      }
    }
    let nextSeq = lastSeq + 1;

    if (data.passNo) {
      const manualSeq = parseInt(data.passNo, 10);
      if (!isNaN(manualSeq)) {
        if (manualSeq <= lastSeq) {
          throw new BadRequestException(`GP Number must be greater than the last entry sequence for this mill (${lastSeq})`);
        }
        nextSeq = manualSeq;
      }
    }

    if (data.rstNo) {
      const manualRst = parseInt(data.rstNo, 10);
      if (!isNaN(manualRst)) {
        const allRstPasses = await this.prisma.gatePass.findMany({
          where: { plantId, passType, rstNo: { not: null } },
          select: { rstNo: true }
        });
        let lastRst = 0;
        for (const p of allRstPasses) {
           if (!p.rstNo) continue;
           const val = parseInt(p.rstNo as string, 10);
           if (!isNaN(val) && val > lastRst) {
               lastRst = val;
           }
        }
        if (manualRst <= lastRst) {
          throw new BadRequestException(`RST Number must be greater than the last entry sequence for this mill (${lastRst})`);
        }
      }
    }

    const seq = String(nextSeq).padStart(5, '0');
    const gpSuffix = isTransfer ? '(T)' : null;
    const qrCode = `${prefix}-${year}-${seq}`;

    // Resolve transfer party names before create
    let transferRecipientName: string | null = null;
    let deliveryAtName: string | null = null;
    const resolvedRecipientPlantId = recipientPlantId || (isTransfer ? supplierId : null);
    if (isTransfer) {
      if (!resolvedRecipientPlantId) {
        throw new BadRequestException('Recipient Mill is required for Transfer Entry.');
      }
      if (!deliveryAtId) {
        throw new BadRequestException('Delivery At is required for Transfer Entry.');
      }
      const recipientPlant = await this.prisma.plant.findUnique({ where: { id: resolvedRecipientPlantId } });
      if (!recipientPlant) {
        throw new BadRequestException('Recipient Mill plant not found.');
      }
      transferRecipientName = recipientPlant.name;
      const deliverySupplier = await this.prisma.supplier.findUnique({ where: { id: deliveryAtId } });
      deliveryAtName = deliverySupplier?.name || 'Unknown';
    }

    // Feedback 28 — Bill No / Bag Type / Finance Soda
    const billNA = billNoNA === true || billNoNA === 'true' || billNo === 'NOT_APPLICABLE';
    if (!billNA && !String(billNo || '').trim()) {
      throw new BadRequestException('Bill No is required (or select Not Applicable)');
    }
    const bag = String(bagTypeGp || '').toUpperCase();
    if (!['PLASTIC', 'JUTE', 'NOT_APPLICABLE'].includes(bag)) {
      throw new BadRequestException('Bag Type must be Plastic, Jute, or Not Applicable');
    }

    let resolvedFinanceSodaId: string | null = null;
    const sodaNA = financeSodaNA === true || financeSodaNA === 'true' || financeSodaId === 'NOT_APPLICABLE';
    if (!sodaNA && !financeSodaId) {
      throw new BadRequestException('Select Finance Soda No. or Not Applicable');
    }

    // Resolve soda number label inside tx when linking; create GP under same lock to prevent over-quota
    const newPass = await this.prisma.$transaction(async (tx) => {
      let sodaNumberLabel: string | null = sodaNo || null;
      if (!sodaNA && financeSodaId) {
        const hit = await this.financeSodaService.assertSodaAssignable(
          financeSodaId,
          plantId,
          passType,
          tx,
        );
        resolvedFinanceSodaId = hit.id;
        sodaNumberLabel = String(hit.sodaNumber);
      }

      if (!isTransfer && supplierId) {
        const sup = await tx.supplier.findUnique({
          where: { id: supplierId },
          select: { name: true, plantId: true },
        });
        if (sup?.plantId && sup.plantId !== plantId) {
          throw new BadRequestException(
            `Arthiya "${sup.name}" belongs to another mill and cannot be used here`,
          );
        }
      }

      return tx.gatePass.create({
      data: {
        plantId,
        passType,
        vehicleNo,
        vehicleType,
        purpose: isTransfer ? 'Transfer Entry' : purpose,
        supplierId: isTransfer ? null : (supplierId || null),
        material,
        driverName,
        contactNo,
        challanNo,
        noOfBags: noOfBags ? parseInt(noOfBags) : null,
        grossWeight: grossWeight ? parseFloat(grossWeight) : null,
        tareWeight: tareWeight ? parseFloat(tareWeight) : null,
        netWeight: netWeight ? parseFloat(netWeight) : null,
        emptyVideoTime,
        loadedVideoTime,
        // Feedback 21: Party Name = Recipient Mill; Note = Delivery At
        partyName: isTransfer ? transferRecipientName : partyName,
        ntWtParty: ntWtParty ? parseFloat(ntWtParty) : null,
        sodaNo: resolvedFinanceSodaId ? sodaNumberLabel : sodaNo,
        remarks: isTransfer ? `Delivery At: ${deliveryAtName}` : remarks,
        gstNo,
        biometricData: data.biometricData || null,
        completedBySupervisor: isTransfer
          ? (data.completedBySupervisor || data.supervisorName || data.submittedBy || null)
          : (data.completedBySupervisor || null),
        status: isDraft ? 'ACTIVE' : 'ACTIVE', // Will keep ACTIVE for both, draft is a flag
        qrCode,
        previousTruckReading: previousTruckReading ? parseFloat(previousTruckReading) : null,
        newTruckReading: newTruckReading ? parseFloat(newTruckReading) : null,
        kmsDriven: kmsDriven ? parseFloat(kmsDriven) : null,
        meterNotWorking: meterNotWorking === true || meterNotWorking === 'true',
        
        // New Fields mapping
        rstNo: rstNo || null,
        gpStartDate: gpStartDate ? new Date(gpStartDate) : new Date(),
        gpCompleteDate:
          !isCompleteDateNA && gpCompleteDate ? new Date(gpCompleteDate) : null,
        isCompleteDateNA: isCompleteDateNA === true,
        weighbridgeActive: weighbridgeActive === true,
        mainBags: mainBags ? parseInt(mainBags) : 0,
        shortageBags: shortageBags ? parseInt(shortageBags) : 0,
        isDraft: isDraft === true,
        isTransfer: isTransfer === true,
        deliveryAtId: isTransfer ? (deliveryAtId || null) : null,
        gpSuffix: gpSuffix,
        actualDispatchPlantId: isTransfer ? plantId : null,
        financeSodaId: resolvedFinanceSodaId,
        financeSodaNA: sodaNA,
        billNo: billNA ? null : String(billNo).trim(),
        billNoNA: billNA,
        bagTypeGp: bag,
        labourPartyId: data.labourPartyId || null,

        // Items creation
        items: items && items.length > 0 ? {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            unit: item.unit,
            quantity: item.quantity ? parseFloat(item.quantity) : 0
          }))
        } : undefined
      },
      include: { 
        supplier: true,
        procurementBatch: {
          include: {
            quality: true,
            weighbridge: true,
            paddyInwardDetails: true
          }
        }
      }
    });
    });

    // If this is a Transfer Entry, create a TransferTicket
    if (isTransfer && resolvedRecipientPlantId) {
      const dispatchPlant = await this.prisma.plant.findUnique({ where: { id: plantId } });

      await this.prisma.transferTicket.create({
        data: {
          dispatchPlantId: plantId,
          recipientPlantId: resolvedRecipientPlantId,
          deliveryAtId: deliveryAtId || null,
          deliveryAtName: deliveryAtName || 'Unknown',
          status: 'PENDING_CONFIRMATION',
          originalGpId: newPass.id
        }
      });

      // Intimation to recipient mill users (Feedback 21) + admin roles
      const msgBase = `${dispatchPlant?.name || 'Dispatch mill'} transferred goods to ${deliveryAtName} on behalf of ${transferRecipientName} via GP ${qrCode} (T). Confirm the transfer ticket to generate GP In/Out.`;

      const access = await this.prisma.userPlantAccess.findMany({
        where: { plantId: resolvedRecipientPlantId },
        include: { user: { include: { role: true } } },
      });
      for (const a of access) {
        const roleName = (a.user as any)?.role?.name || '';
        if (!/SUPERVISOR|PLANT_MANAGER|SUPER_ADMIN/i.test(roleName)) continue;
        await this.prisma.notification.create({
          data: {
            title: 'Transfer Entry — Action Required',
            message: `[${transferRecipientName}] ${msgBase}`,
            type: 'WARNING',
            userId: a.userId,
            role: roleName,
          },
        });
      }
      await this.prisma.notification.create({
        data: {
          title: 'New Transfer Entry Created',
          message: `Transfer GP ${qrCode} (T) created by ${dispatchPlant?.name || plantId}. Recipient: ${transferRecipientName}. Delivery At: ${deliveryAtName}. Awaiting confirmation.`,
          type: 'INFO',
          role: 'SUPER_ADMIN',
        },
      });
    }

    // Feedback 28: operational GP cut without finance soda → notify Admin + that mill's supervisors
    // Skip drafts — notify only on real cut (non-draft create) or when draft is later completed
    const draftFlag = isDraft === true || isDraft === 'true';
    if (!isTransfer && sodaNA && !draftFlag) {
      const operational = await this.hasOperationalGatePassItems(items, material);
      if (operational) {
        await this.financeSodaService.notifyMissingSoda(plantId, qrCode);
      }
    }

    // Feedback 29/31: non-draft GP with soda → Sale/Purchase report + Party Ledger
    if (!isDraft && resolvedFinanceSodaId) {
      try {
        await this.salePurchaseService.syncFromGatePass(newPass.id);
      } catch (e: any) {
        console.error('F29/F31 sale/purchase + ledger sync failed', e);
        throw new BadRequestException(
          e?.message ||
            'Gate Pass saved but Sale/Purchase ledger sync failed. Use Sync ledger from reports, then retry.',
        );
      }
    }

    return newPass;
  }

  async getRecentGatePasses(
    plantId: string,
    type: string,
    status?: string,
    page?: string,
    limit?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const whereClause: any = plantId === 'global' ? {} : { plantId };
    if (type !== 'ALL') {
      whereClause.passType = type;
    }
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    const pageNum = parseInt(page || '1', 10);
    let limitNum = parseInt(limit || '0', 10);
    if (!limitNum) {
      limitNum = type === 'ALL' ? 50 : 10;
    }
    const skip = (pageNum - 1) * limitNum;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.gatePass.count({ where: whereClause }),
      this.prisma.gatePass.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: { supplier: true, items: true, plant: true },
      }),
    ]);

    // Enrich transfer GPs with Delivery At note for report Note column (Feedback 21)
    const transferIds = data.filter((p) => p.isTransfer).map((p) => p.id);
    let ticketByGp = new Map<string, any>();
    if (transferIds.length > 0) {
      const tickets = await this.prisma.transferTicket.findMany({
        where: {
          OR: [
            { originalGpId: { in: transferIds } },
            { autoGpInId: { in: transferIds } },
            { autoGpOutId: { in: transferIds } },
          ],
        },
        include: { dispatchPlant: true, recipientPlant: true },
      });
      for (const t of tickets) {
        if (t.originalGpId) ticketByGp.set(t.originalGpId, t);
        if (t.autoGpInId) ticketByGp.set(t.autoGpInId, t);
        if (t.autoGpOutId) ticketByGp.set(t.autoGpOutId, t);
      }
    }

    const enriched = data.map((p) => {
      const ticket = ticketByGp.get(p.id);
      let deliveryAtNote = p.remarks || null;
      let displayParty = p.partyName || p.supplier?.name || null;
      if (p.isTransfer && ticket) {
        deliveryAtNote = ticket.deliveryAtName;
        if (p.id === ticket.originalGpId) {
          displayParty = ticket.recipientPlant?.name || displayParty;
        } else if (p.id === ticket.autoGpInId) {
          displayParty = ticket.dispatchPlant?.name || displayParty;
        } else if (p.id === ticket.autoGpOutId) {
          displayParty = ticket.deliveryAtName || displayParty;
        }
      }
      return {
        ...p,
        partyName: displayParty || p.partyName,
        deliveryAtNote,
      };
    });

    return { data: enriched, total };
  }

  async getGatePassByQr(qrCode: string) {
    const pass = await this.prisma.gatePass.findFirst({
      where: { qrCode },
      include: { 
        plant: true,
        supplier: true,
        items: true,
        procurementBatch: {
          include: {
            quality: true,
            weighbridge: true,
            paddyInwardDetails: true
          }
        }
      }
    });
    if (!pass) {
      throw new NotFoundException(`Gate pass with QR code ${qrCode} not found`);
    }

    // Try to find a weighbridge transaction for this vehicle
    let latestWeighbridge: any = null;
    let relatedInwardPass: any = null;

    if (pass.passType === 'OUTWARD') {
      relatedInwardPass = await this.prisma.gatePass.findFirst({
        where: {
          vehicleNo: pass.vehicleNo,
          passType: 'INWARD',
          plantId: pass.plantId,
          createdAt: { lte: pass.createdAt }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          procurementBatch: {
            include: { quality: true }
          }
        }
      });
    }

    const baselineDate = relatedInwardPass ? relatedInwardPass.createdAt : pass.createdAt;

    latestWeighbridge = await this.prisma.weighbridgeTransaction.findFirst({
      where: {
        plantId: pass.plantId,
        vehicleNo: pass.vehicleNo,
        createdAt: { gte: baselineDate }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      ...pass,
      latestWeighbridge,
      relatedInwardPass
    };
  }

  async getAnalytics(plantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause = plantId === 'global' ? {} : { plantId };

    const totalGateIn = await this.prisma.gatePass.count({
      where: { ...whereClause, passType: 'INWARD', createdAt: { gte: today } }
    });
    
    const totalGateOut = await this.prisma.gatePass.count({
      where: { ...whereClause, passType: 'OUTWARD', createdAt: { gte: today } }
    });

    const activeGatePass = await this.prisma.gatePass.count({
      where: { ...whereClause, status: 'ACTIVE' }
    });

    return {
      totalGateIn,
      totalGateOut,
      qrScanned: totalGateIn + totalGateOut, // Mocked for now
      duplicatesBlocked: 5, // Mocked for now
      activeGatePass
    };
  }

  async getCampusStatus(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };
    const activeGatePass = await this.prisma.gatePass.count({
      where: { ...whereClause, status: 'ACTIVE' }
    });
    const completed = await this.prisma.gatePass.count({
      where: plantId === 'global' ? { status: 'COMPLETED' } : { plantId, status: 'COMPLETED' }
    });

    return {
      activeInward: activeGatePass,
      activeGatePass,
      completed,
      total: activeGatePass + completed
    };
  }

  async getDuplicateLogs(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };
    return this.prisma.duplicateGatePassLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async updateGatePass(id: string, data: any) {
    const pass = await this.prisma.gatePass.findUnique({ where: { id } });
    if (!pass) throw new NotFoundException('Gate Pass not found');
    // Feedback 11: Once a GP (including Draft) is saved, disable editing including Weighbridge data
    throw new BadRequestException('Saved Gate Passes cannot be edited (including drafts and weighbridge data).');
  }

  /**
   * Feedback 28 — cancel/reverse a gate pass so soda delivered count rolls back
   * (CANCELLED GPs are excluded from FinanceSoda quota / mill cells G,H,I).
   */
  async cancelGatePass(id: string, reason?: string) {
    const pass = await this.prisma.gatePass.findUnique({ where: { id } });
    if (!pass) throw new NotFoundException('Gate Pass not found');
    if (pass.status === 'CANCELLED') throw new BadRequestException('Gate Pass already cancelled');

    const updated = await this.prisma.gatePass.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        remarks: reason
          ? `${pass.remarks || ''}\n[CANCELLED] ${reason}`.trim()
          : pass.remarks,
      },
    });

    // F29/F31: remove sale/purchase report row + Party Ledger + roll back Section K
    try {
      await this.salePurchaseService.removeForGatePass(id);
    } catch (e: any) {
      console.error('F29/F31 remove report/ledger line failed', e);
      throw new BadRequestException(
        e?.message ||
          'Gate Pass cancelled but Sale/Purchase ledger cleanup failed. Retry cancel or Sync ledger from reports.',
      );
    }

    return updated;
  }

  /** Resolve inventory qty for a GP item â€” Feedback 20: use total bags when bag-based */
  private resolveInventoryQuantity(
    pass: any,
    item: { quantity: number | null; unit: string },
    options: { isPrimaryBagItem: boolean },
  ) {
    const bagTotal =
      ((pass.mainBags || 0) + (pass.shortageBags || 0)) ||
      pass.noOfBags ||
      0;
    const unit = (item.unit || '').toUpperCase();
    const isBagUnit =
      unit.includes('BAG') ||
      unit === 'NOS' ||
      unit === 'NUMBERS' ||
      unit === 'NUMBER';
    let qty = Number(item.quantity) || 0;

    // Feedback 20: inventory moves by Total Bags (Main + Shortage) for the primary bag line
    if (isBagUnit && bagTotal > 0 && options.isPrimaryBagItem) {
      qty = bagTotal;
    } else if (isBagUnit && bagTotal > 0 && !options.isPrimaryBagItem) {
      // Avoid double-counting total bags across multiple bag lines
      qty = 0;
    }

    return qty;
  }

  private async applyGatePassInventory(pass: any, tx: any) {
    let inventoryItems: { material: string; quantity: number | null; unit: string }[] = [];
    if (pass.items && pass.items.length > 0) {
      inventoryItems = pass.items.map((item: any) => ({
        material: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
      }));
    } else if (pass.material && (pass.netWeight || pass.noOfBags || pass.mainBags)) {
      const bagTotal =
        ((pass.mainBags || 0) + (pass.shortageBags || 0)) ||
        pass.noOfBags ||
        0;
      inventoryItems = [
        {
          material: pass.material,
          quantity: bagTotal || pass.netWeight,
          unit: bagTotal ? 'Bags' : 'Quintal',
        },
      ];
    }

    const firstBagIdx = inventoryItems.findIndex((i) => {
      const u = (i.unit || '').toUpperCase();
      return u.includes('BAG') || u === 'NOS';
    });

    for (let idx = 0; idx < inventoryItems.length; idx++) {
      const item = inventoryItems[idx];
      let itemType = 'FINISHED_GOODS';
      const upMat = item.material.toUpperCase();
      if (upMat.includes('RICE')) itemType = 'RICE';
      else if (upMat.includes('BRAN')) itemType = 'BRAN';
      else if (upMat.includes('HUSK')) itemType = 'HUSK';
      else if (upMat.includes('PADDY')) itemType = 'PADDY';
      else itemType = 'CONSUMABLES';

      let qty = this.resolveInventoryQuantity(pass, item, {
        isPrimaryBagItem: idx === firstBagIdx,
      });
      if (pass.passType === 'OUTWARD') {
        qty = -Math.abs(qty);
      } else {
        qty = Math.abs(qty);
      }

      if (!qty) continue;

      await this.inventoryService.adjustStock({
        plantId: pass.plantId,
        itemType,
        variety: item.material,
        quantityChange: qty,
        transactionType: pass.passType === 'INWARD' ? 'IN' : 'OUT',
        referenceId: pass.id,
        remarks: `${pass.passType} Gate Pass ${pass.qrCode}`,
        unit: item.unit || 'Bags',
        tx,
      });
    }
  }

  async completeGatePass(id: string, completionData?: any) {
    const pass = await this.prisma.gatePass.findUnique({ 
      where: { id },
      include: { items: true },
    });
    if (!pass) throw new NotFoundException('Gate Pass not found');
    if (pass.status === 'COMPLETED') throw new BadRequestException('Gate Pass already completed');
    if (pass.status === 'CANCELLED') throw new BadRequestException('Gate Pass is cancelled');

    if (!completionData?.biometricData && !pass.biometricData) {
      throw new BadRequestException('Biometric authentication is strictly required to close the Gate Pass');
    }

    // Weight difference alert â€” mill vs party in Qtl (threshold 0.50)
    if (pass.weighbridgeActive && pass.netWeight != null && pass.ntWtParty != null) {
      const diff = Math.abs(Number(pass.netWeight) - Number(pass.ntWtParty));
      if (diff > 0.5) {
        await this.prisma.notification.create({
          data: {
            title: 'Weight Difference Alert',
            message: `Gate Pass ${pass.qrCode} has a weight difference of ${diff.toFixed(2)} Qtl (Mill: ${pass.netWeight}, Party: ${pass.ntWtParty}).`,
            type: 'ALERT',
            role: 'SUPER_ADMIN',
          },
        });
      }
    }

    const supervisorName = completionData?.supervisorName || 'Authenticated Supervisor';

    let gpCompleteDate: Date | null = null;
    const isCompleteDateNA = completionData?.isCompleteDateNA ?? pass.isCompleteDateNA;
    if (completionData?.gpCompleteDate) {
        gpCompleteDate = new Date(completionData.gpCompleteDate);
    } else if (!isCompleteDateNA) {
        gpCompleteDate = new Date();
      }

    if (!isCompleteDateNA && pass.gpStartDate && gpCompleteDate) {
      this.assertMinGpInOutGap(pass.gpStartDate, gpCompleteDate);
    }

    const updateData: any = {
      status: 'COMPLETED',
      biometricData: completionData?.biometricData || pass.biometricData,
      gpCompleteDate,
      isCompleteDateNA: !!isCompleteDateNA,
      completedBySupervisor: supervisorName,
      isDraft: false,
    };

    const updatedPass = await this.prisma.$transaction(async (tx) => {
      // F28/F29: re-check soda quota when a draft becomes real (drafts never burned quota)
      if (pass.financeSodaId && pass.isDraft) {
        await this.financeSodaService.assertSodaAssignable(
          pass.financeSodaId,
          pass.plantId,
          pass.passType,
          tx,
        );
      }

      const gpass = await tx.gatePass.update({
        where: { id },
        data: updateData,
      });

      await this.applyGatePassInventory(pass, tx);
      return gpass;
    });

    // F28: draft → real cut with soda N/A + operational items → notify now (skipped on draft save)
    if (pass.isDraft && !pass.isTransfer) {
      const sodaNA =
        pass.financeSodaNA === true ||
        !pass.financeSodaId ||
        pass.financeSodaId === 'NOT_APPLICABLE';
      if (sodaNA) {
        const operational = await this.hasOperationalGatePassItems(
          pass.items || [],
          pass.material || undefined,
        );
        if (operational) {
          await this.financeSodaService.notifyMissingSoda(
            pass.plantId,
            pass.qrCode || id,
          );
        }
      }
    }

    // F29/F31: draft → submitted on complete → report line + Party Ledger
    if (pass.financeSodaId) {
      try {
        await this.salePurchaseService.syncFromGatePass(id);
      } catch (e: any) {
        console.error('F29/F31 sale/purchase + ledger sync on complete failed', e);
        throw new BadRequestException(
          e?.message ||
            'Gate Pass completed but Sale/Purchase ledger sync failed. Use Sync ledger from reports, then retry.',
        );
      }
    }

    try {
      await this.labourWork.syncFromGatePass(id);
    } catch (e) {
      console.error('Labour work order from gate pass failed', e);
    }

    return updatedPass;
  }

  async finalizeDailyReport(plantId: string, data: any) {
    if (!data?.biometricData) {
      throw new BadRequestException(
        'Biometric fingerprint signature is strictly required to close the GP Report.',
      );
    }
    if (!data?.manualMatchConfirmed) {
      throw new BadRequestException(
        'You must confirm that the digital GP report matches the manual physical GP records.',
      );
    }

    const supervisorName = data.supervisorName || 'Authenticated Supervisor';
    const submittedAt = new Date();

    // Local calendar day (Asia/Kolkata-safe) — do NOT use toISOString after setHours(0)
    const now = new Date();
    const reportDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const whereClause: any = {
      status: 'ACTIVE',
      createdAt: { gte: today },
    };
    if (plantId !== 'global') {
      whereClause.plantId = plantId;
    }

    // Close each ACTIVE pass properly (with inventory) — Feedback 12/20
    const activePasses = await this.prisma.gatePass.findMany({
      where: whereClause,
      select: { id: true, qrCode: true },
    });

    const closed: string[] = [];
    for (const p of activePasses) {
      try {
        await this.completeGatePass(p.id, {
        biometricData: data.biometricData,
          supervisorName,
          isCompleteDateNA: false,
          gpCompleteDate: submittedAt.toISOString(),
        });
        closed.push(p.qrCode || p.id);
      } catch (err: any) {
        // Skip already-completed race; continue others
        console.warn(`Finalize skip ${p.qrCode}: ${err?.message || err}`);
      }
    }

    await this.prisma.notification.create({
      data: {
        title: 'Daily GP Report Finalized',
        message: `GP Report for ${reportDate} finalized by ${supervisorName} at ${submittedAt.toLocaleString()}. Fingerprint verified. Closed ${closed.length} active pass(es). Digital report confirmed to match manual records.`,
        type: 'INFO',
        role: 'SUPER_ADMIN',
      },
    });
    await this.prisma.notification.create({
      data: {
        title: 'Daily GP Report Finalized',
        message: `GP Report for ${reportDate} finalized by ${supervisorName} at ${submittedAt.toLocaleString()}. Fingerprint verified. Digital report confirmed to match manual records.`,
        type: 'INFO',
        role: 'SUPERVISOR',
      },
    });

    // Feedback 34 — auto-update shortage daily report when evening GP report is submitted
    // Always write the global snapshot so Daily Consolidated UI can consume it
    let shortageSnapshot: any = null;
    try {
      shortageSnapshot = await this.procurementService.submitDailyShortageReport({
        date: reportDate,
        plantId: 'global',
        submittedBy: supervisorName,
        source: 'EVENING_GP_FINALIZE',
      });
      // Also store plant-scoped copy when finalizing a specific mill
      if (plantId && plantId !== 'global') {
        await this.procurementService.submitDailyShortageReport({
          date: reportDate,
          plantId,
          submittedBy: supervisorName,
          source: 'EVENING_GP_FINALIZE',
        });
      }
    } catch (e) {
      console.error('Feedback 34 shortage daily snapshot on GP finalize failed', e);
    }

    // Feedback 35 — auto daily inward summary when evening GP report is submitted
    let inwardListSnapshot: any = null;
    try {
      inwardListSnapshot = await this.procurementService.submitEveningInwardLists({
        plantId: plantId || 'global',
        date: reportDate,
        supervisorName,
        biometricData: data.biometricData,
        source: 'EVENING_GP_FINALIZE',
      });
    } catch (e) {
      console.error('Feedback 35 inward list snapshot on GP finalize failed', e);
    }

    return {
      message: 'Report successfully finalized.',
      supervisorName,
      submittedAt: submittedAt.toISOString(),
      closedCount: closed.length,
      closedPasses: closed,
      shortageSnapshot: shortageSnapshot?.message || null,
      inwardListSnapshot: inwardListSnapshot?.message || null,
    };
  }

  async getLastTruckReading(vehicleNo: string) {
    const lastPass = await this.prisma.gatePass.findFirst({
      where: {
        vehicleNo,
        newTruckReading: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: { newTruckReading: true }
    });

    return { lastReading: lastPass?.newTruckReading || null };
  }
  async getNextSeq(plantId: string, passType: string) {
    const prefix = passType === 'INWARD' ? 'GIN' : 'GOUT';
    const year = new Date().getFullYear();

    // Match generateGatePass chronology (global unique qrCode series)
    const allPasses = await this.prisma.gatePass.findMany({
      where: { 
        passType,
        qrCode: { startsWith: `${prefix}-${year}-` },
      },
      select: { qrCode: true },
    });

    let lastSeq = 0;
    for (const p of allPasses) {
      if (!p.qrCode) continue;
      const parts = p.qrCode.split('-');
      if (parts.length === 3) {
        const seqNum = parseInt(parts[2], 10);
        if (!isNaN(seqNum) && seqNum > lastSeq) lastSeq = seqNum;
      }
    }

    // Also surface last RST for this plant for chronology UI
    const allRstPasses = await this.prisma.gatePass.findMany({
      where: { plantId, passType, rstNo: { not: null } },
      select: { rstNo: true },
    });
    let lastRst = 0;
    for (const p of allRstPasses) {
      if (!p.rstNo) continue;
      const val = parseInt(p.rstNo as string, 10);
      if (!isNaN(val) && val > lastRst) lastRst = val;
    }

    return { nextSeq: lastSeq + 1, lastSeq, nextRst: lastRst + 1, lastRst };
  }

  // ===========================
  // TRANSFER ENTRY MANAGEMENT
  // ===========================

  /** Get all transfer tickets with filtering */
  async getTransferTickets(plantId: string, status?: string) {
    const whereClause: any = {};
    if (plantId !== 'global') {
      whereClause.OR = [
        { dispatchPlantId: plantId },
        { recipientPlantId: plantId }
      ];
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    return this.prisma.transferTicket.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        dispatchPlant: true,
        recipientPlant: true,
        originalGp: {
          include: { supplier: true, items: true }
        },
        autoGpIn: {
          include: { supplier: true, items: true }
        },
        autoGpOut: {
          include: { supplier: true, items: true }
        }
      }
    });
  }

  /** Confirm a transfer ticket — atomic dual-entry (GP In + GP Out) */
  async confirmTransferTicket(
    ticketId: string,
    confirmData: {
      supervisorName: string;
      recipientPlantId?: string;
      biometricData?: string;
      confirmingPlantId?: string;
    },
  ) {
    if (!confirmData?.biometricData) {
      throw new BadRequestException('Fingerprint is required to confirm Transfer Entry.');
    }

    const ticket = await this.prisma.transferTicket.findUnique({
      where: { id: ticketId },
      include: {
        originalGp: { include: { items: true, supplier: true, plant: true } },
        dispatchPlant: true,
        recipientPlant: true,
      }
    });

    if (!ticket) throw new NotFoundException('Transfer Ticket not found');
    if (ticket.status !== 'PENDING_CONFIRMATION') throw new BadRequestException('This transfer ticket has already been processed.');

    // Feedback 21: only the Recipient Mill confirms — cannot rewrite recipient
    const recipientPlantId = ticket.recipientPlantId;
    if (
      confirmData.confirmingPlantId &&
      confirmData.confirmingPlantId !== 'global' &&
      confirmData.confirmingPlantId !== recipientPlantId
    ) {
      throw new BadRequestException(
        'Only the Recipient Mill can confirm this Transfer Entry. Switch plant context to the recipient mill.',
      );
    }
    if (
      confirmData.recipientPlantId &&
      confirmData.recipientPlantId !== recipientPlantId
    ) {
      throw new BadRequestException('Recipient Mill is fixed on the transfer ticket and cannot be changed at confirm.');
    }

    const originalGp = ticket.originalGp;
    const dispatchPlantName = ticket.dispatchPlant?.name || originalGp.plant?.name || 'Dispatch Mill';
    const deliveryAtName = ticket.deliveryAtName || 'Delivery At';

    // --- ATOMIC TRANSACTION: Create GP In + GP Out for Recipient Mill ---
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Generate GP In sequence for the recipient plant
      const yearNow = new Date().getFullYear();

      // GP In sequence
      const allInPasses = await tx.gatePass.findMany({
        where: { passType: 'INWARD', qrCode: { startsWith: `GIN-${yearNow}-` } },
        select: { qrCode: true }
      });
      let lastInSeq = 0;
      for (const p of allInPasses) {
        if (!p.qrCode) continue;
        const parts = p.qrCode.split('-');
        if (parts.length === 3) {
          const s = parseInt(parts[2], 10);
          if (!isNaN(s) && s > lastInSeq) lastInSeq = s;
        }
      }
      const gpInSeq = String(lastInSeq + 1).padStart(5, '0');
      const gpInQrCode = `GIN-${yearNow}-${gpInSeq}`;

      // GP Out sequence
      const allOutPasses = await tx.gatePass.findMany({
        where: { passType: 'OUTWARD', qrCode: { startsWith: `GOUT-${yearNow}-` } },
        select: { qrCode: true }
      });
      let lastOutSeq = 0;
      for (const p of allOutPasses) {
        if (!p.qrCode) continue;
        const parts = p.qrCode.split('-');
        if (parts.length === 3) {
          const s = parseInt(parts[2], 10);
          if (!isNaN(s) && s > lastOutSeq) lastOutSeq = s;
        }
      }
      const gpOutSeq = String(lastOutSeq + 1).padStart(5, '0');
      const gpOutQrCode = `GOUT-${yearNow}-${gpOutSeq}`;

      // 2. Create GP In for Recipient Mill — Party Name = Actual Dispatch Mill
      const gpIn = await tx.gatePass.create({
        data: {
          plantId: recipientPlantId,
          passType: 'INWARD',
          vehicleNo: originalGp.vehicleNo,
          vehicleType: originalGp.vehicleType,
          purpose: 'Transfer Entry',
          supplierId: originalGp.supplierId,
          material: originalGp.material,
          driverName: originalGp.driverName,
          contactNo: originalGp.contactNo,
          challanNo: originalGp.challanNo,
          noOfBags: originalGp.noOfBags,
          grossWeight: originalGp.grossWeight,
          tareWeight: originalGp.tareWeight,
          netWeight: originalGp.netWeight,
          mainBags: originalGp.mainBags,
          shortageBags: originalGp.shortageBags,
          weighbridgeActive: originalGp.weighbridgeActive,
          status: 'COMPLETED',
          qrCode: gpInQrCode,
          isTransfer: true,
          gpSuffix: '(T)',
          partyName: dispatchPlantName,
          remarks: `Delivery At: ${deliveryAtName}`,
          actualDispatchPlantId: ticket.dispatchPlantId,
          completedBySupervisor: confirmData.supervisorName,
          biometricData: confirmData.biometricData,
          gpCompleteDate: new Date(),
          items: originalGp.items && originalGp.items.length > 0 ? {
            create: originalGp.items.map((item: any) => ({
              itemName: item.itemName,
              unit: item.unit,
              quantity: item.quantity
            }))
          } : undefined
        }
      });

      // 3. Create GP Out for Recipient Mill — Party Name = Delivery At
      const gpOut = await tx.gatePass.create({
        data: {
          plantId: recipientPlantId,
          passType: 'OUTWARD',
          vehicleNo: originalGp.vehicleNo,
          vehicleType: originalGp.vehicleType,
          purpose: 'Transfer Entry',
          supplierId: originalGp.supplierId,
          material: originalGp.material,
          driverName: originalGp.driverName,
          contactNo: originalGp.contactNo,
          challanNo: originalGp.challanNo,
          noOfBags: originalGp.noOfBags,
          grossWeight: originalGp.grossWeight,
          tareWeight: originalGp.tareWeight,
          netWeight: originalGp.netWeight,
          mainBags: originalGp.mainBags,
          shortageBags: originalGp.shortageBags,
          weighbridgeActive: originalGp.weighbridgeActive,
          status: 'COMPLETED',
          qrCode: gpOutQrCode,
          isTransfer: true,
          gpSuffix: '(T)',
          partyName: deliveryAtName,
          remarks: `Delivery At: ${deliveryAtName}`,
          deliveryAtId: ticket.deliveryAtId,
          actualDispatchPlantId: ticket.dispatchPlantId,
          completedBySupervisor: confirmData.supervisorName,
          biometricData: confirmData.biometricData,
          gpCompleteDate: new Date(),
          items: originalGp.items && originalGp.items.length > 0 ? {
            create: originalGp.items.map((item: any) => ({
              itemName: item.itemName,
              unit: item.unit,
              quantity: item.quantity
            }))
          } : undefined
        }
      });

      // 4. Process inventory for GP In (add stock) and GP Out (remove stock) â€” NIL EFFECT
      if (originalGp.items && originalGp.items.length > 0) {
        for (const item of originalGp.items) {
          let itemType = 'FINISHED_GOODS';
          const upMat = item.itemName.toUpperCase();
          if (upMat.includes('RICE')) itemType = 'RICE';
          if (upMat.includes('BRAN')) itemType = 'BRAN';
          if (upMat.includes('HUSK')) itemType = 'HUSK';
          if (upMat.includes('PADDY')) itemType = 'PADDY';

          // GP In: Add to stock
          await this.inventoryService.adjustStock({
            plantId: recipientPlantId,
            itemType,
            variety: item.itemName,
            quantityChange: Number(item.quantity),
            transactionType: 'IN',
            referenceId: gpIn.id,
            remarks: `Transfer GP In ${gpInQrCode} (T)`,
            tx
          });

          // GP Out: Remove from stock (net zero effect)
          await this.inventoryService.adjustStock({
            plantId: recipientPlantId,
            itemType,
            variety: item.itemName,
            quantityChange: -Number(item.quantity),
            transactionType: 'OUT',
            referenceId: gpOut.id,
            remarks: `Transfer GP Out ${gpOutQrCode} (T)`,
            tx
          });
        }
      }

      // 5. Close the transfer ticket
      const updatedTicket = await tx.transferTicket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          recipientPlantId,
          autoGpInId: gpIn.id,
          autoGpOutId: gpOut.id
        }
      });

      return { ticket: updatedTicket, gpIn, gpOut };
    });

    // Send notification about closure
    await this.prisma.notification.create({
      data: {
        title: 'Transfer Ticket Confirmed',
        message: `Transfer Ticket for GP ${ticket.originalGp.qrCode} (T) has been confirmed by ${confirmData.supervisorName}. Auto-generated GP In: ${result.gpIn.qrCode} (T), GP Out: ${result.gpOut.qrCode} (T).`,
        type: 'INFO',
        role: 'SUPER_ADMIN'
      }
    });

    return result;
  }

  /** Get consignment slip data â€” only available for Recipient Mill's GP Out */
  async getConsignmentSlipData(gatePassId: string, requestingPlantId: string) {
    const pass = await this.prisma.gatePass.findUnique({
      where: { id: gatePassId },
      include: { supplier: true, items: true, plant: true }
    });

    if (!pass) throw new NotFoundException('Gate Pass not found');
    if (!pass.isTransfer) throw new BadRequestException('Consignment slips are only available for Transfer GPs.');

    // Section 4.1: Actual Dispatch Mill CANNOT create the consignment slip
    if (pass.actualDispatchPlantId === requestingPlantId) {
      throw new BadRequestException('Actual Dispatch Mill cannot create the Consignment dispatch slip. Only the Recipient Mill can.');
    }

    // Section 4.2: Only GP Out of the Recipient Mill can generate the slip
    if (pass.passType !== 'OUTWARD') {
      throw new BadRequestException('Consignment slip can only be generated from the Recipient Mill\'s GP Out entry.');
    }

    // Get the transfer ticket for context
    const ticket = await this.prisma.transferTicket.findFirst({
      where: { autoGpOutId: gatePassId },
      include: { dispatchPlant: true, recipientPlant: true, originalGp: true }
    });

    return {
      gatePass: pass,
      transferTicket: ticket,
      consignmentData: {
        date: pass.gpCompleteDate || pass.createdAt,
        fromMill: ticket?.recipientPlant?.name || pass.plant?.name,
        toDeliveryAt: ticket?.deliveryAtName || 'N/A',
        truckNo: pass.vehicleNo,
        driverName: pass.driverName,
        items: pass.items,
        netWeight: pass.netWeight,
        noOfBags: pass.noOfBags,
        gpNo: `${pass.qrCode} ${pass.gpSuffix || ''}`,
        originalDispatchGpNo: ticket?.originalGp?.qrCode ? `${ticket.originalGp.qrCode} (T)` : 'N/A',
        supervisorName: pass.completedBySupervisor
      }
    };
  }
}

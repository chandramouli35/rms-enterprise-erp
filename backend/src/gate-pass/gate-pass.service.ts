import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class GatePassService {
  constructor(private prisma: PrismaService, private inventoryService: InventoryService) {}

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
      rstNo, gpStartDate, isCompleteDateNA, weighbridgeActive, mainBags, shortageBags, isDraft, items,
      // Transfer Entry fields
      isTransfer, deliveryAtId
    } = data;
    
    // Duplicate prevention for INWARD passes
    if (passType === 'INWARD') {
      const existingActivePass = await this.prisma.gatePass.findFirst({
        where: {
          plantId,
          vehicleNo,
          passType: 'INWARD',
          status: 'ACTIVE'
        }
      });

      if (existingActivePass) {
        // Log the duplicate attempt
        await this.prisma.duplicateGatePassLog.create({
          data: {
            plantId,
            vehicleNo,
            attemptedType: 'INWARD',
            reason: 'Vehicle already has an active INWARD pass'
          }
        });
        throw new ConflictException(`Vehicle ${vehicleNo} already has an active INWARD pass in the campus.`);
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

    const newPass = await this.prisma.gatePass.create({
      data: {
        plantId,
        passType,
        vehicleNo,
        vehicleType,
        purpose,
        supplierId: supplierId || null,
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
        partyName,
        ntWtParty: ntWtParty ? parseFloat(ntWtParty) : null,
        sodaNo,
        remarks,
        gstNo,
        biometricData: data.biometricData || null,
        status: isDraft ? 'ACTIVE' : 'ACTIVE', // Will keep ACTIVE for both, draft is a flag
        qrCode,
        previousTruckReading: previousTruckReading ? parseFloat(previousTruckReading) : null,
        newTruckReading: newTruckReading ? parseFloat(newTruckReading) : null,
        kmsDriven: kmsDriven ? parseFloat(kmsDriven) : null,
        meterNotWorking: meterNotWorking === true || meterNotWorking === 'true',
        
        // New Fields mapping
        rstNo: rstNo || null,
        gpStartDate: gpStartDate ? new Date(gpStartDate) : new Date(),
        isCompleteDateNA: isCompleteDateNA === true,
        weighbridgeActive: weighbridgeActive === true,
        mainBags: mainBags ? parseInt(mainBags) : 0,
        shortageBags: shortageBags ? parseInt(shortageBags) : 0,
        isDraft: isDraft === true,
        isTransfer: isTransfer === true,
        deliveryAtId: isTransfer ? (deliveryAtId || null) : null,
        gpSuffix: gpSuffix,
        actualDispatchPlantId: isTransfer ? plantId : null,

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

    // If this is a Transfer Entry, create a TransferTicket
    if (isTransfer && supplierId) {
      // supplierId in transfer context = recipientPlantId (the mill on whose behalf)
      // We look up the supplier to get the name for deliveryAtName
      let deliveryAtName = 'Unknown';
      if (deliveryAtId) {
        const deliverySupplier = await this.prisma.supplier.findUnique({ where: { id: deliveryAtId } });
        if (deliverySupplier) deliveryAtName = deliverySupplier.name;
      }

      // Find the recipient plant from the suppliers list or use a mapping
      // For now, we store supplierId as the recipientPlantId reference
      await this.prisma.transferTicket.create({
        data: {
          dispatchPlantId: plantId,
          recipientPlantId: plantId, // Will be updated when recipient confirms
          deliveryAtId: deliveryAtId || null,
          deliveryAtName,
          status: 'PENDING_CONFIRMATION',
          originalGpId: newPass.id
        }
      });

      // Send notification to Admin about new transfer ticket
      await this.prisma.notification.create({
        data: {
          title: 'New Transfer Entry Created',
          message: `Transfer GP ${qrCode} ${gpSuffix} has been created. Delivery At: ${deliveryAtName}. Awaiting recipient confirmation.`,
          type: 'INFO',
          role: 'SUPER_ADMIN'
        }
      });
    }

    return newPass;
  }

  async getRecentGatePasses(plantId: string, type: string, status?: string, page?: string, limit?: string) {
    const whereClause: any = plantId === 'global' ? {} : { plantId };
    if (type !== 'ALL') {
      whereClause.passType = type;
    }
    
    // Explicitly filter by status if provided (e.g. 'COMPLETED' or 'ACTIVE')
    if (status && status !== 'all') {
      whereClause.status = status;
    } else {
      // If status is not provided or is 'all', for the default GP report, we might want to default to COMPLETED
      // but to preserve existing behavior where it might fetch all, we only restrict if status is explicitly passed
    }

    const pageNum = parseInt(page || '1', 10);
    // If not provided, default to ALL = 50, otherwise 10
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
        include: { supplier: true, items: true }
      })
    ]);

    return { data, total };
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

    const activeInward = await this.prisma.gatePass.count({
      where: { ...whereClause, status: 'ACTIVE', passType: 'INWARD' }
    });

    return {
      totalGateIn,
      totalGateOut,
      qrScanned: totalGateIn + totalGateOut, // Mocked for now
      duplicatesBlocked: 5, // Mocked for now
      activeGatePass: activeInward
    };
  }

  async getCampusStatus(plantId: string) {
    const whereClause = plantId === 'global' ? {} : { plantId };
    const activeInward = await this.prisma.gatePass.count({
      where: { ...whereClause, status: 'ACTIVE', passType: 'INWARD' }
    });
    const completed = await this.prisma.gatePass.count({
      where: { plantId, status: 'COMPLETED' }
    });

    return {
      activeInward,
      completed,
      total: activeInward + completed
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
    if (!pass.isDraft) throw new BadRequestException('Only Draft Gate Passes can be edited');
    // Block edits on Transfer GP entries (Section 3.7)
    if (pass.isTransfer) throw new BadRequestException('Transfer Gate Passes cannot be edited independently.');

    const { 
      vehicleNo, vehicleType, purpose, supplierId, driverName, contactNo, challanNo, 
      emptyVideoTime, loadedVideoTime, partyName, sodaNo, remarks, gstNo, rstNo, isDraft, items
    } = data;

    if (items && items.length > 0) {
      await this.prisma.gatePassItem.deleteMany({ where: { gatePassId: id } });
      await this.prisma.gatePassItem.createMany({
        data: items.map((item: any) => ({
          gatePassId: id,
          itemName: item.itemName,
          unit: item.unit,
          quantity: item.quantity ? parseFloat(item.quantity) : 0
        }))
      });
    }

    return this.prisma.gatePass.update({
      where: { id },
      data: {
        vehicleNo, vehicleType, purpose, supplierId: supplierId || null, 
        driverName, contactNo, challanNo, emptyVideoTime, loadedVideoTime, 
        partyName, sodaNo, remarks, gstNo, rstNo, isDraft
      }
    });
  }

  async completeGatePass(id: string, completionData?: any) {
    const pass = await this.prisma.gatePass.findUnique({ 
      where: { id },
      include: { items: true } 
    });
    if (!pass) throw new NotFoundException('Gate Pass not found');
    if (pass.status === 'COMPLETED') throw new BadRequestException('Gate Pass already completed');

    if (!completionData?.biometricData && !pass.biometricData) {
      throw new BadRequestException('Biometric authentication is strictly required to close the Gate Pass');
    }

    if (pass.weighbridgeActive && pass.netWeight && pass.ntWtParty) {
      const diff = Math.abs(pass.netWeight - pass.ntWtParty);
      if (diff > 0.50) {
        // Trigger alert to Admin
        await this.prisma.notification.create({
          data: {
            title: "Weight Difference Alert",
            message: `Gate Pass ${pass.qrCode} has a weight difference of ${diff.toFixed(2)} MT (Mill: ${pass.netWeight}, Party: ${pass.ntWtParty}).`,
            type: "ALERT",
            role: "SUPER_ADMIN"
          }
        });
      }
    }

    // Capture supervisor name from payload
    const supervisorName = completionData.supervisorName || "Authenticated Supervisor";

    let completedBySupervisor = null;
    let gpCompleteDate: Date | null = null;

    if (completionData) {
      if (completionData.supervisorName) {
        completedBySupervisor = completionData.supervisorName;
      }
      if (completionData.gpCompleteDate) {
        gpCompleteDate = new Date(completionData.gpCompleteDate);
      } else if (!pass.isCompleteDateNA) {
        gpCompleteDate = new Date();
      }
    } else if (!pass.isCompleteDateNA) {
      gpCompleteDate = new Date();
    }

    const updateData: any = {
      status: 'COMPLETED',
      biometricData: completionData.biometricData,
      gpCompleteDate,
      isCompleteDateNA: completionData.isCompleteDateNA || false,
      completedBySupervisor: supervisorName
    };

    // Run everything in a transaction for ACID compliance
    const updatedPass = await this.prisma.$transaction(async (tx) => {
      const gpass = await tx.gatePass.update({
        where: { id },
        data: updateData
      });

      // Determine items for inventory. Use new `items` array if it exists, otherwise fallback to legacy `material`/`noOfBags`
      let inventoryItems: { material: string; quantity: number | null; unit: string }[] = [];
      if (pass.items && pass.items.length > 0) {
        inventoryItems = pass.items.map(item => ({
          material: item.itemName,
          quantity: item.quantity,
          unit: item.unit
        }));
      } else if (pass.material && (pass.netWeight || pass.noOfBags)) {
        inventoryItems = [{
          material: pass.material,
          quantity: pass.netWeight || pass.noOfBags,
          unit: pass.netWeight ? 'Quintal' : 'Bags'
        }];
      }

      // Process inventory atomically
      for (const item of inventoryItems) {
        let itemType = 'FINISHED_GOODS';
        const upMat = item.material.toUpperCase();
        if (upMat.includes('RICE')) itemType = 'RICE';
        if (upMat.includes('BRAN')) itemType = 'BRAN';
        if (upMat.includes('HUSK')) itemType = 'HUSK';
        if (upMat.includes('PADDY')) itemType = 'PADDY';

        let qty = Number(item.quantity);
        if (pass.passType === 'OUTWARD') {
          // If OUTWARD, quantity is negated
          qty = -qty;
        }
        
        await this.inventoryService.adjustStock({
          plantId: pass.plantId,
          itemType: itemType,
          variety: item.material,
          quantityChange: qty,
          transactionType: pass.passType === 'INWARD' ? 'IN' : 'OUT',
          referenceId: pass.id,
          remarks: `${pass.passType} Gate Pass ${pass.qrCode}`,
          tx // pass transaction reference
        });
      }

      return gpass;
    });

    // Check Weight Discrepancy outside transaction (non-critical)
    if (pass.netWeight && pass.ntWtParty) {
      const diff = Math.abs(pass.netWeight - pass.ntWtParty);
      if (diff > 0.50) {
        console.warn(`[ALERT] Weight discrepancy of ${diff.toFixed(2)} Qtl detected for GatePass ${pass.qrCode}. Notification sent to Admin.`);
        // Assuming a Notification service exists, we would call it here:
        // this.notificationService.notifyAdmin('WEIGHT_DISCREPANCY', pass.id);
      }
    }

    return updatedPass;
  }

  async finalizeDailyReport(plantId: string, data: any) {
    if (!data?.biometricData) {
      throw new BadRequestException("Biometric fingerprint signature is strictly required to close the GP Report.");
    }
    if (!data?.manualMatchConfirmed) {
      throw new BadRequestException("You must confirm that the digital GP report matches the manual physical GP records.");
    }

    const supervisorName = data.supervisorName || "Authenticated Supervisor";

    // Close all ACTIVE passes for today as part of the report finalization
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: any = {
      status: 'ACTIVE',
      createdAt: {
        gte: today
      }
    };
    if (plantId !== 'global') {
      whereClause.plantId = plantId;
    }

    await this.prisma.gatePass.updateMany({
      where: whereClause,
      data: {
        status: 'COMPLETED',
        completedBySupervisor: supervisorName,
        biometricData: data.biometricData,
        gpCompleteDate: new Date()
      }
    });

    // Log the report finalization
    await this.prisma.notification.create({
      data: {
        title: 'Daily GP Report Finalized',
        message: `The Gate Pass Report for ${today.toDateString()} has been verified and closed by ${supervisorName}.`,
        type: 'INFO',
        role: 'SUPER_ADMIN'
      }
    });

    return { message: "Report successfully finalized and all active passes for today are closed." };
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

    const lastPass = await this.prisma.gatePass.findFirst({
      where: { 
        plantId,
        passType,
        qrCode: { startsWith: `${prefix}-${year}-` }
      },
      orderBy: { qrCode: 'desc' }
    });
    
    let nextSeq = 1;
    if (lastPass && lastPass.qrCode) {
      const parts = lastPass.qrCode.split('-');
      if (parts.length === 3) {
        nextSeq = parseInt(parts[2], 10) + 1;
      }
    }
    return { nextSeq };
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
  async confirmTransferTicket(ticketId: string, confirmData: { supervisorName: string; recipientPlantId: string }) {
    const ticket = await this.prisma.transferTicket.findUnique({
      where: { id: ticketId },
      include: {
        originalGp: { include: { items: true, supplier: true } }
      }
    });

    if (!ticket) throw new NotFoundException('Transfer Ticket not found');
    if (ticket.status !== 'PENDING_CONFIRMATION') throw new BadRequestException('This transfer ticket has already been processed.');

    const originalGp = ticket.originalGp;
    const recipientPlantId = confirmData.recipientPlantId || ticket.recipientPlantId;

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
          purpose: 'Intermill',
          supplierId: originalGp.supplierId,
          material: originalGp.material,
          driverName: originalGp.driverName,
          contactNo: originalGp.contactNo,
          challanNo: originalGp.challanNo,
          noOfBags: originalGp.noOfBags,
          grossWeight: originalGp.grossWeight,
          tareWeight: originalGp.tareWeight,
          netWeight: originalGp.netWeight,
          status: 'COMPLETED',
          qrCode: gpInQrCode,
          isTransfer: true,
          gpSuffix: '(T)',
          actualDispatchPlantId: ticket.dispatchPlantId,
          completedBySupervisor: confirmData.supervisorName,
          gpCompleteDate: new Date(),
          remarks: `Auto-generated Transfer GP In from ${originalGp.qrCode} (T)`,
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
          purpose: 'Intermill',
          supplierId: originalGp.supplierId,
          material: originalGp.material,
          driverName: originalGp.driverName,
          contactNo: originalGp.contactNo,
          challanNo: originalGp.challanNo,
          noOfBags: originalGp.noOfBags,
          grossWeight: originalGp.grossWeight,
          tareWeight: originalGp.tareWeight,
          netWeight: originalGp.netWeight,
          status: 'COMPLETED',
          qrCode: gpOutQrCode,
          isTransfer: true,
          gpSuffix: '(T)',
          deliveryAtId: ticket.deliveryAtId,
          actualDispatchPlantId: ticket.dispatchPlantId,
          completedBySupervisor: confirmData.supervisorName,
          gpCompleteDate: new Date(),
          remarks: `Auto-generated Transfer GP Out to ${ticket.deliveryAtName} from ${originalGp.qrCode} (T)`,
          items: originalGp.items && originalGp.items.length > 0 ? {
            create: originalGp.items.map((item: any) => ({
              itemName: item.itemName,
              unit: item.unit,
              quantity: item.quantity
            }))
          } : undefined
        }
      });

      // 4. Process inventory for GP In (add stock) and GP Out (remove stock) — NIL EFFECT
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

  /** Get consignment slip data — only available for Recipient Mill's GP Out */
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
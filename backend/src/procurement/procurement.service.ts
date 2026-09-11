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
      category, purchaseType, bugs, godown, biometricData,
      mandiType, boliRate, boliChecklist
    } = data;

    // Feedback 33 — normalize Mandi GP for duplicate bypass (case / spaces / specials)
    const normalizeGpKey = (raw?: string) =>
      String(raw || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const mandiGpKey = normalizeGpKey(data.mandiEgpNo || data.mandiEgNo);
    if (mandiGpKey) {
      const recent = await this.prisma.paddyInwardDetails.findMany({
        where: {
          mandiEgNo: { not: null },
          ...(data.id ? { procurementBatchId: { not: data.id } } : {}),
        },
        select: { mandiEgNo: true, id: true },
        orderBy: { createdAt: 'desc' },
      });
      const dup = recent.find((r) => normalizeGpKey(r.mandiEgNo || '') === mandiGpKey);
      if (dup) {
        throw new BadRequestException(
          `Duplicate Mandi Gate Pass blocked (normalized match). Value: ${data.mandiEgpNo || data.mandiEgNo}`,
        );
      }
    }

    // Feedback 33 — global truck rules:
    // 1) Block if any ACTIVE/DRAFT/PENDING unload exists globally (no time limit) — including new drafts
    // 2) On confirm: also require 2h gap from last CONFIRMED/COMPLETED updatedAt
    const truckNo = String(data.truckNo || '').trim().toUpperCase();
    if (truckNo) {
      const activeElsewhere = await this.prisma.paddyInwardDetails.findFirst({
        where: {
          truckNo: { equals: truckNo, mode: 'insensitive' },
          ...(data.id
            ? { procurementBatchId: { not: data.id } }
            : {}),
          procurementBatch: {
            status: { in: ['DRAFT', 'PENDING', 'ACTIVE', 'UNLOADING'] },
          },
        },
        include: { procurementBatch: true },
        orderBy: { createdAt: 'desc' },
      });
      if (activeElsewhere) {
        throw new BadRequestException(
          `Truck ${truckNo} is actively unloading (status ${activeElsewhere.procurementBatch?.status}) at another/same mill. Finish that GP first.`,
        );
      }

      // Feedback 33 — 2h gap applies to draft + confirm (cannot open a new GP within window)
      const lastCompleted = await this.prisma.paddyInwardDetails.findFirst({
        where: {
          truckNo: { equals: truckNo, mode: 'insensitive' },
          ...(data.id ? { procurementBatchId: { not: data.id } } : {}),
          procurementBatch: {
            status: { in: ['CONFIRMED', 'COMPLETED'] },
          },
        },
        include: { procurementBatch: true },
        orderBy: { updatedAt: 'desc' },
      });
      if (lastCompleted) {
        const completedAt = lastCompleted.updatedAt || lastCompleted.createdAt;
        const elapsed = Date.now() - new Date(completedAt).getTime();
        if (elapsed < 2 * 60 * 60 * 1000) {
          throw new BadRequestException(
            `Truck ${truckNo} completed a trip less than 2 hours ago. Minimum 2-hour gap required before a new trip.`,
          );
        }
      }
    }

    // Feedback 33 — 30 min min unload duration
    if (data.unloadingStartTime && (data.unloadingFinishTime || data.unloadingEndTime)) {
      const start = String(data.unloadingStartTime);
      const end = String(data.unloadingFinishTime || data.unloadingEndTime);
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      if ([sh, sm, eh, em].every((n) => Number.isFinite(n))) {
        let diff = eh * 60 + em - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60;
        if (diff < 30) {
          throw new BadRequestException('Unloading Finish Time must be at least 30 minutes after Start Time');
        }
      }
    }

    // Feedback 33 — Hoodi cannot be N.A. when allocation is Hoodi
    if (data.allocationType === 'Hoodi' && (data.hoodiUpload === 'N.A.' || data.hoodiUpload === 'NA')) {
      throw new BadRequestException('Upload at Hoodi Register cannot be N.A. when Allocation Type is Hoodi');
    }

    const parsedNetWeight = parseFloat(netWeight) || parseFloat(data.netWtMill) || parseFloat(data.netWeightWb) || 0;
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
      let batch: any;
      let wasDraft = false;

      if (data.id) {
        const existing = await tx.procurementBatch.findUnique({
          where: { id: data.id },
          include: { paddyInwardDetails: true },
        });
        if (!existing) throw new BadRequestException('Inward record not found for update');
        wasDraft = existing.status === 'DRAFT';
        if (!wasDraft && existing.status !== 'PENDING') {
          // Allow completing DRAFT/PENDING; block re-edit of confirmed
          if (existing.status === 'CONFIRMED' || existing.status === 'COMPLETED') {
            throw new BadRequestException('Confirmed inward cannot be edited. Create a new entry if needed.');
          }
        }
        batch = await tx.procurementBatch.update({
          where: { id: data.id },
          data: {
            plantId,
            supplierId: supplierId || null,
            gatePassId: gatePassId || null,
            weighbridgeId: weighbridgeId || null,
            netWeight: parsedNetWeight,
            category: category || existing.category || 'OPERATIONAL',
            purchaseType: purchaseType || existing.purchaseType || 'PADDY_NORMAL',
            baseRate: parsedRate,
            finalRate,
            amount: baseAmount,
            deductions: parsedRate - finalRate,
            netAmount: totalAmount,
            biometricData: biometricData || existing.biometricData || null,
            status: data.status === 'DRAFT' ? 'DRAFT' : data.status === 'CONFIRMED' ? 'CONFIRMED' : existing.status,
          },
        });
      } else {
        // 1. Create ProcurementBatch
        batch = await tx.procurementBatch.create({
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
            deductions: parsedRate - finalRate,
            netAmount: totalAmount,
            biometricData: biometricData || null,
            status: data.status === 'DRAFT' ? 'DRAFT' : data.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
            paddyInwardDetails: {
              create: {
                mandiType: mandiType || null,
                boliRate: boliRate ? parseFloat(boliRate) : null,
                boliChecklist: false,
              },
            },
          },
        });
      }

      // 2. Save Quality Inspection (create once)
      const existingQi = await tx.qualityInspection.findFirst({ where: { procurementBatchId: batch.id } });
      if (existingQi) {
        await tx.qualityInspection.update({
          where: { id: existingQi.id },
          data: {
            moisture: parseFloat(moisture) || 0,
            broken: parseFloat(broken) || 0,
            discoloration: parseFloat(discoloration) || 0,
            foreignMatter: parseFloat(foreignMatter) || 0,
          },
        });
      } else {
        await tx.qualityInspection.create({
          data: {
            procurementBatchId: batch.id,
            moisture: parseFloat(moisture) || 0,
            broken: parseFloat(broken) || 0,
            discoloration: parseFloat(discoloration) || 0,
            foreignMatter: parseFloat(foreignMatter) || 0,
            status: 'PENDING',
            inspectedBy: inspectedBy || null,
          },
        });
      }

      // 3a. Update PaddyStack if Stacking
      if (data.allocationType === 'Stacking' && data.stackNo) {
        const bagsRec = parseFloat(data.bagsRecAtMill) || 0;
        const netWt = parseFloat(data.netWtAtMill) || 0;
        const moistureVal = parseFloat(moisture) || 0;
        const isAClass = data.bagType === 'NEW' && data.originalBardanaClass === 'A_Class';

        const existingStack = await tx.paddyStack.findUnique({
          where: { plantId_stackNo: { plantId, stackNo: data.stackNo } }
        });

        if (existingStack) {
          const newTotalBags = existingStack.totalBags + bagsRec;
          const newTotalWt = existingStack.totalWeight + netWt;
          // Weighted average moisture
          const newAvgMoisture = newTotalWt > 0 
            ? ((existingStack.averageMoisture * existingStack.totalWeight) + (moistureVal * netWt)) / newTotalWt
            : moistureVal;

          await tx.paddyStack.update({
            where: { id: existingStack.id },
            data: {
              totalBags: newTotalBags,
              totalWeight: newTotalWt,
              averageMoisture: newAvgMoisture,
              bagsAClass: isAClass ? existingStack.bagsAClass + bagsRec : existingStack.bagsAClass,
              bagsBClass: !isAClass ? existingStack.bagsBClass + bagsRec : existingStack.bagsBClass,
              status: 'ACTIVE' // automatically reactive if it was empty
            }
          });
        } else {
          await tx.paddyStack.create({
            data: {
              plantId,
              stackNo: data.stackNo,
              totalBags: bagsRec,
              totalWeight: netWt,
              averageMoisture: moistureVal,
              bagsAClass: isAClass ? bagsRec : 0,
              bagsBClass: !isAClass ? bagsRec : 0,
              isNewAClass: isAClass,
              status: 'ACTIVE'
            }
          });
        }
      }

      // 3. Update Inventory (skip draft; only once when confirming)
      if (data.status !== 'DRAFT' && (!data.id || wasDraft)) {
        await this.inventoryService.adjustStock({
          plantId,
          itemType: 'PADDY',
          quantityChange: parsedNetWeight,
          transactionType: 'IN',
          referenceId: batch.id,
          remarks: `Purchase entry ${batch.id.substring(0, 8)}`,
          godown: godown || data.stackNo || 'Main Yard',
          category: category || 'OPERATIONAL',
          stockValueChange: totalAmount
        });
      }

      // 4. Shortage composition (Feedback 33 + 34 ledger / narrations)
      const bagWt = parseFloat(data.standardBagWeight) || 0.382;
      const qualityCutType = data.qualityCutType || 'NONE';
      const qualityCutValue = parseFloat(data.qualityCutValue) || 0;
      let qualityCutQtl = parseFloat(data.qualityCutQtl) || 0;
      if (!qualityCutQtl) {
        if (qualityCutType === 'BAGS') qualityCutQtl = qualityCutValue * bagWt;
        else if (qualityCutType === 'PERCENTAGE') {
          const millWt = parseFloat(data.netWtMill) || parsedNetWeight || 0;
          qualityCutQtl = (qualityCutValue / 100) * millWt;
        }
      }

      const millBagsExShort =
        (parseFloat(data.origAClass) || 0) + (parseFloat(data.origBClass) || 0);
      const agencyBags =
        (parseFloat(data.origAClassAg) || 0) + (parseFloat(data.origBClassAg) || 0);
      const bagsLess = Math.max(0, agencyBags - millBagsExShort);
      const bagsLessQtl = bagsLess * bagWt;

      const reqNet = parseFloat(data.reqNetWt) || parseFloat(data.requiredNetWt) || 0;
      const millNet = parseFloat(data.netWtMill) || parsedNetWeight || 0;
      const weightDiff = reqNet - millNet; // >0 shortage, <0 excess
      const weightShortageQtl = weightDiff > 0 ? weightDiff : 0;

      // Feedback 34 — Section 5 shortage bags received → reduce Artia liability
      const shortageBagsReceived =
        (parseFloat(data.shortageAClass) || 0) + (parseFloat(data.shortageBClass) || 0);
      const shortageBagsReceivedQtl = shortageBagsReceived > 0 ? shortageBagsReceived * bagWt : 0;

      type LedgerEntry = {
        type: string;
        direction: 'DEBIT' | 'CREDIT';
        amountQtl: number;
        amountBags: number;
        narration: string;
      };
      const ledger: LedgerEntry[] = [];

      if (qualityCutType === 'BAGS' && qualityCutValue > 0) {
        ledger.push({
          type: 'QUALITY_CUT',
          direction: 'DEBIT',
          amountQtl: parseFloat(qualityCutQtl.toFixed(3)),
          amountBags: qualityCutValue,
          narration: `${qualityCutValue} Bags Quality Cut`,
        });
      } else if (qualityCutType === 'PERCENTAGE' && qualityCutValue > 0) {
        ledger.push({
          type: 'QUALITY_CUT',
          direction: 'DEBIT',
          amountQtl: parseFloat(qualityCutQtl.toFixed(3)),
          amountBags: parseFloat((qualityCutQtl / bagWt).toFixed(2)),
          narration: `${qualityCutValue}% Quality Cut`,
        });
      }

      // Bags less than Agency (excluding shortage bags) — unless Inform Bauji
      let bagsLessShortageQtl = 0;
      if (bagsLess > 0 && !data.informBaujiBagsLess) {
        bagsLessShortageQtl = bagsLessQtl;
        ledger.push({
          type: 'BAGS_LESS',
          direction: 'DEBIT',
          amountQtl: parseFloat(bagsLessQtl.toFixed(3)),
          amountBags: bagsLess,
          narration: `${bagsLess} Bags Shortage`,
        });
      }

      // Weight shortage — always post when mill net < required, but do NOT double-count
      // the bags-less qtl already posted above. If Inform Bauji bags-less, full weightDiff posts.
      const residualWeightShortage = Math.max(
        0,
        weightShortageQtl - (data.informBaujiBagsLess ? 0 : bagsLessShortageQtl),
      );
      if (residualWeightShortage > 0.0005 || (weightShortageQtl > 0 && data.informBaujiBagsLess)) {
        const wAmt = data.informBaujiBagsLess ? weightShortageQtl : residualWeightShortage;
        if (wAmt > 0.0005) {
          ledger.push({
            type: 'WEIGHT_SHORTAGE',
            direction: 'DEBIT',
            amountQtl: parseFloat(wAmt.toFixed(3)),
            amountBags: parseFloat((wAmt / bagWt).toFixed(2)),
            narration: 'Weight Shortage',
          });
        }
      }

      // Shortage bags received at mill → CREDIT / reduce artia shortage
      if (shortageBagsReceived > 0) {
        ledger.push({
          type: 'SHORTAGE_BAGS_RECEIVED',
          direction: 'CREDIT',
          amountQtl: parseFloat(shortageBagsReceivedQtl.toFixed(3)),
          amountBags: shortageBagsReceived,
          narration: `${shortageBagsReceived} Bags Shortage Received`,
        });
      }

      const excessQtl = weightDiff < 0 ? Math.abs(weightDiff) : 0;
      if (data.informBaujiExcessWeight && excessQtl > 0) {
        ledger.push({
          type: 'EXCESS_WEIGHT',
          direction: 'CREDIT',
          amountQtl: parseFloat(excessQtl.toFixed(3)),
          amountBags: parseFloat((excessQtl / bagWt).toFixed(2)),
          narration: 'Excess Weight Received',
        });
      }

      const totalShortageQtl = ledger
        .filter((e) => e.direction === 'DEBIT')
        .reduce((s, e) => s + e.amountQtl, 0);
      // Auto recovery from shortage bags received + excess bauji; preserve manual punch if updating
      const autoRecoveryQtl = ledger
        .filter((e) => e.direction === 'CREDIT')
        .reduce((s, e) => s + e.amountQtl, 0);
      const existingDetails = await tx.paddyInwardDetails.findUnique({
        where: { procurementBatchId: batch.id },
        select: { shortageRecoveryQtl: true, shortageLedger: true },
      });
      // Manual recovery beyond auto credits (user punched extra)
      let manualExtra = 0;
      if (existingDetails?.shortageLedger && Array.isArray(existingDetails.shortageLedger)) {
        const prevAuto = (existingDetails.shortageLedger as any[])
          .filter((e) => e.direction === 'CREDIT' && e.type !== 'MANUAL_RECOVERY')
          .reduce((s, e) => s + (Number(e.amountQtl) || 0), 0);
        const prevTotal = existingDetails.shortageRecoveryQtl || 0;
        manualExtra = Math.max(0, prevTotal - prevAuto);
      }
      if (manualExtra > 0) {
        ledger.push({
          type: 'MANUAL_RECOVERY',
          direction: 'CREDIT',
          amountQtl: parseFloat(manualExtra.toFixed(3)),
          amountBags: parseFloat((manualExtra / bagWt).toFixed(2)),
          narration: 'Shortage Recovery',
        });
      }
      const shortageRecoveryQtl = autoRecoveryQtl + manualExtra;
      // Feedback 34 — Auto Narration ON (default) joins ledger phrases; OFF keeps user text
      const autoNarrationOn =
        data.autoNarration !== false &&
        data.autoNarration !== 'false' &&
        data.autoNarration !== 0;
      const shortageNarration = autoNarrationOn
        ? ledger.map((e) => e.narration).join('; ')
        : String(data.shortageNarration || ledger.map((e) => e.narration).join('; '));

      const supplierForParty = supplierId
        ? await tx.supplier.findUnique({ where: { id: supplierId }, select: { name: true } })
        : null;
      const resolvedPartyName =
        (data.partyName && String(data.partyName).trim()) ||
        supplierForParty?.name ||
        null;

      await tx.paddyInwardDetails.update({
        where: { procurementBatchId: batch.id },
        data: {
          truckNo: data.truckNo,
          gpNo: data.gpNo,
          mandiEgNo: data.mandiEgpNo || data.mandiEgNo,
          mandi: data.mandi,
          partyName: resolvedPartyName,
          rstNo: data.rstNo,
          mandiParchiNo: data.mandiParchiNo,
          pahunchPersonName: data.pahunchPersonName,
          safaiType: data.safai || data.safaiType,
          mandiType: mandiType || data.mandiType || null,
          boliRate: boliRate ? parseFloat(boliRate) : null,
          intimationToMandi: !!(data.mandiIntimation === 'Yes' || data.mandiIntimation === 'N.A.'),
          mandiQualityAlert: data.mandiIntimation === 'Yes',
          remarks: data.remarks != null ? String(data.remarks) : null,
          discrepancy: data.discrepancy != null ? String(data.discrepancy) : null,
          allocationType: data.allocationType,
          stackNo: data.stackNo,
          bagType: data.bagType,
          originalBardanaClass: data.originalBardanaClass,
          agencyGpBardanaClass: data.agencyGpBardanaClass,
          bagsRecAtMill: parseFloat(data.bagsRecAtMill) || 0,
          bagsAtAgencyGp: parseFloat(data.bagsAtAgencyGp) || 0,
          netWtAtMill: parseFloat(data.netWtMill) || parseFloat(data.netWtAtMill) || 0,
          requiredNetWt: parseFloat(data.reqNetWt) || parseFloat(data.requiredNetWt) || 0,
          netWtDifference: parseFloat(data.netWtDiff) || parseFloat(data.netWtDifference) || 0,
          netWtAtParty: parseFloat(data.netWtParty) || parseFloat(data.netWtAtParty) || 0,
          shortageType: data.shortageType,
          shortageAClass: parseFloat(data.shortageAClass) || 0,
          shortageBClass: parseFloat(data.shortageBClass) || 0,
          qualityCutType,
          qualityCutValue,
          qualityCutReason: data.qualityCutReason || null,
          qualityCutQtl,
          weightShortageQtl: parseFloat(
            (
              ledger.find((e) => e.type === 'WEIGHT_SHORTAGE')?.amountQtl || 0
            ).toFixed(3),
          ),
          bagsLessShortageQtl,
          shortageNarration,
          shortageLedger: ledger,
          govtRate: data.govtRate ? parseFloat(data.govtRate) : null,
          standardBagWeight: bagWt,
          totalBagsCalculated: data.totalBagsCalculated ? parseFloat(data.totalBagsCalculated) : null,
          standardWeightCalculated: data.standardWeightCalculated ? parseFloat(data.standardWeightCalculated) : null,
          actualWeightReceived:
            data.actualWeightReceived !== undefined && data.actualWeightReceived !== null
              ? parseFloat(data.actualWeightReceived)
              : parseFloat(data.netWtMill) || null,
          shortageQtl: totalShortageQtl > 0 ? totalShortageQtl : 0,
          shortageRecoveryQtl,
          shortageBags: totalShortageQtl > 0 ? totalShortageQtl / bagWt : null,
          aClassGiven:
            data.origAClassAg != null || data.aClassGiven != null
              ? parseFloat(data.origAClassAg ?? data.aClassGiven) || 0
              : null,
          aClassReceived:
            data.origAClass != null || data.aClassReceived != null
              ? parseFloat(data.origAClass ?? data.aClassReceived) || 0
              : null,
          aClassPending: data.aClassPending ? parseFloat(data.aClassPending) : null,
          bClassGiven:
            data.origBClassAg != null || data.bClassGiven != null
              ? parseFloat(data.origBClassAg ?? data.bClassGiven) || 0
              : null,
          bClassReceived:
            data.origBClass != null || data.bClassReceived != null
              ? parseFloat(data.origBClass ?? data.bClassReceived) || 0
              : null,
          bClassPending: data.bClassPending ? parseFloat(data.bClassPending) : null,
          autoConvertedToBClass: data.autoConvertedToBClass ? parseFloat(data.autoConvertedToBClass) : null,
          bagsRecLessThanAgencyGp: !!(data.bagsRecLessThanAgencyGp || data.informBaujiBagsLess),
          plusWtConsiderInShortageRecovery: !!(data.plusWtConsiderInShortageRecovery || data.informBaujiExcessWeight),
          informBaujiBagsLess: !!data.informBaujiBagsLess,
          informBaujiExcessWeight: !!data.informBaujiExcessWeight,
          grossWeight: data.grossWeight != null ? parseFloat(data.grossWeight) : null,
          tareWeight: data.tareWeight != null ? parseFloat(data.tareWeight) : null,
          netWeightWb:
            data.netWeightWb != null
              ? parseFloat(data.netWeightWb)
              : data.grossWeight != null && data.tareWeight != null
                ? parseFloat(data.grossWeight) - parseFloat(data.tareWeight)
                : null,
          mainUnloaderTruckCount: data.mainUnloaderTruckCount || data.unloaderTruckCount
            ? parseFloat(data.mainUnloaderTruckCount || data.unloaderTruckCount)
            : null,
          bagsInMainStack: data.bagsInMainStack ? parseFloat(data.bagsInMainStack) : null,
          secondPartStackNo: data.secondPartStackNo || data.partStackNo || null,
          bagsInSecondPartStack: data.bagsInSecondPartStack || data.bagsInPartStack
            ? parseFloat(data.bagsInSecondPartStack || data.bagsInPartStack)
            : null,
          unloaderName: data.allocateUnloader || data.unloaderName || null,
          partUnloaderName: data.partUnloaderName || null,
          partUnloaderTruckCount: data.partUnloaderTruckCount
            ? parseFloat(data.partUnloaderTruckCount)
            : null,
          meterNotWorking: !!data.meterNotWorking,
          newTruckReading: data.newTruckReading != null ? parseFloat(data.newTruckReading) : null,
          moisture: parsedMoisture,
          driverName: data.driverName || null,
          driverMobileNumber: data.mobileNumber || data.driverMobileNumber || null,
          isUploadedToHoodiRegister: data.hoodiUpload === 'Yes',
          allocateUnloader: data.allocateUnloader || null,
          labourType: data.labour || data.labourType || null,
          timeIn: data.timeIn || null,
          timeOut: data.timeOut || null,
          entryDate: data.date || data.entryDate || null,
          bhariVideoUrl: data.bhariVideoUpload || data.bhariVideoUrl || null,
          khaliVideoUrl: data.khaliVideoUpload || data.khaliVideoUrl || null,
          unloadingStartTime: (() => {
            const t = data.unloadingStartTime;
            if (!t) return null;
            if (typeof t === 'string' && t.includes('T')) return new Date(t);
            if (typeof t === 'string' && /^\d{1,2}:\d{2}/.test(t)) {
              const base = data.date || new Date().toISOString().slice(0, 10);
              return new Date(`${base}T${t.length === 5 ? t + ':00' : t}`);
            }
            return new Date(t);
          })(),
          unloadingEndTime: (() => {
            const t = data.unloadingFinishTime || data.unloadingEndTime;
            if (!t) return null;
            if (typeof t === 'string' && t.includes('T')) return new Date(t);
            if (typeof t === 'string' && /^\d{1,2}:\d{2}/.test(t)) {
              const base = data.date || new Date().toISOString().slice(0, 10);
              return new Date(`${base}T${t.length === 5 ? t + ':00' : t}`);
            }
            return new Date(t);
          })(),
        },
      });

      if (data.informBaujiBagsLess || data.informBaujiExcessWeight) {
        const action = data.informBaujiExcessWeight ? 'INFORM_BAUJI_EXCESS_WEIGHT' : 'INFORM_BAUJI_BAGS_LESS';
        const details = data.informBaujiExcessWeight
          ? `Excess weight Inform Bauji for truck ${data.truckNo}. Diff: ${data.netWtDiff || data.shortageQtl}`
          : `Bags less than Agency GP Inform Bauji for truck ${data.truckNo}`;
        await this.notifyAdmin(tx, data.userId, action, details, batch.id, plantId);
      }

      // 5. Apply boli receive bags ONLY on confirm (not draft) — prevents double-count
      if (
        data.status !== 'DRAFT' &&
        (mandiType === 'Boli' || data.mandiType === 'Boli') &&
        data.boliInputs &&
        Object.keys(data.boliInputs).length > 0
      ) {
        for (const [boliId, bagsRec] of Object.entries(data.boliInputs)) {
          const received = parseFloat(bagsRec as string);
          if (received > 0) {
            const boli = await tx.paddyBoli.findUnique({ where: { id: boliId } });
            if (boli && !boli.isCancelled && !boli.isCompleted) {
              await tx.paddyBoli.update({
                where: { id: boliId },
                data: { bagsReceived: boli.bagsReceived + received },
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

      // 8. Notification for Bags Received
      if (data.bagsRecAtMill && parseFloat(data.bagsRecAtMill) > 0) {
        await tx.systemAuditLog.create({
          data: {
            action: 'BAGS_RECEIVED_NOTIFICATION',
            module: 'PROCUREMENT',
            entityId: batch.id,
            details: `Paddy Inward (GP No: ${data.gpNo || '-'}): Received a total of ${data.bagsRecAtMill} bags at the mill.`,
            userId: 'SYSTEM',
            plantId: plantId
          }
        });
      }

      // 9. Integration with Hoodi (only on confirm)
      if (data.status !== 'DRAFT' && data.allocationType === 'Hoodi') {
        const supplier = supplierId ? await tx.supplier.findUnique({ where: { id: supplierId } }) : null;
        await tx.hoodiRecord.create({
          data: {
            plantId,
            sourceType: 'DIRECT_INWARD',
            date: new Date(),
            gpNo: data.gpNo,
            mandiGpNo: data.mandiEgpNo || data.mandiEgNo,
            truckNo: data.truckNo,
            supplierName: supplier?.name || null,
            mandiName: data.mandi,
            stackNo: 'Direct-Inward',
            bags: parseFloat(data.bagsRecAtMill) || 0,
            moisture: parsedMoisture,
            unloadedBy: data.allocateUnloader || data.unloaderName || 'System',
            inwardId: batch.id
          }
        });
      }

      return batch;
    });
  }


  async getInwards(plantId: string, dateFrom?: string, dateTo?: string, mandi?: string, supplierId?: string, page?: string, limit?: string) {
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
    
    // Add additional filters for Inwards
    if (mandi || supplierId) {
       if (mandi) {
         whereClause.paddyInwardDetails = {
           mandi: { contains: mandi, mode: 'insensitive' },
         };
       }
       if (supplierId) whereClause.supplierId = supplierId;
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, inwards] = await this.prisma.$transaction([
      this.prisma.procurementBatch.count({ where: whereClause }),
      this.prisma.procurementBatch.findMany({
        where: whereClause,
        include: {
          supplier: true,
          paddyInwardDetails: true,
          weighbridge: true,
          quality: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    const mappedData = inwards.map(b => ({
      purchaseNo: b.id.substring(0, 8).toUpperCase(),
      date: b.createdAt.toISOString().split('T')[0],
      gpNo: b.paddyInwardDetails?.gpNo || '-',
      supplier: b.supplier?.name || 'Walk-in',
      mandiEgNo: b.paddyInwardDetails?.mandiEgNo || '-',
      rstNo: b.paddyInwardDetails?.rstNo || '-',
      vehicleNo: b.weighbridge?.vehicleNo || b.paddyInwardDetails?.truckNo || '-',
      grossWt: b.paddyInwardDetails?.grossWeight || b.grossWeight || '-',
      tareWt: b.paddyInwardDetails?.tareWeight || b.tareWeight || '-',
      netWt: b.netWeight || b.paddyInwardDetails?.netWtAtMill || b.paddyInwardDetails?.netWeightWb || '-',
      status: b.status,
      // Feedback 33 list columns — Actual Received = mill bags excluding shortage bags
      actualReceivedBags:
        ((b.paddyInwardDetails?.aClassReceived ?? 0) + (b.paddyInwardDetails?.bClassReceived ?? 0)) ||
        null,
      bagsAtAgencyGp:
        (b.paddyInwardDetails?.bagsAtAgencyGp ??
          ((b.paddyInwardDetails?.aClassGiven ?? 0) + (b.paddyInwardDetails?.bClassGiven ?? 0))) ||
        null,
      timeIn: b.paddyInwardDetails?.timeIn || null,
      timeOut: b.paddyInwardDetails?.timeOut || null,
      ...b.paddyInwardDetails,
      id: b.id,
      weighbridge: b.weighbridge,
      quality: b.quality,
      supplierDetails: b.supplier,
      batchStatus: b.status,
    }));
    
    return { data: mappedData, total };
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

  async getRecentPurchases(plantId: string, dateFrom?: string, dateTo?: string, page?: string, limit?: string) {
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

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, batches] = await this.prisma.$transaction([
      this.prisma.procurementBatch.count({ where: whereClause }),
      this.prisma.procurementBatch.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          supplier: true,
          quality: true,
          weighbridge: true,
          paddyInwardDetails: true
        }
      })
    ]);

    const mappedData = batches.map((b: any) => ({
      id: b.id,
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
    
    return { data: mappedData, total };
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

  async getSuppliers(plantId?: string) {
    // Mill-scoped Arthiya: when plantId set, only that mill's suppliers
    const where =
      plantId && plantId !== 'global' && plantId !== 'all'
        ? { plantId }
        : undefined;
    return this.prisma.supplier.findMany({
      where,
      include: { plant: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(data: {
    name: string;
    contact?: string;
    email?: string;
    address?: string;
    firmNames?: string[];
    mandi?: string;
    plantId?: string;
  }) {
    const { name, contact, email, address, firmNames, mandi, plantId } = data;
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new BadRequestException('Arthiya name is required');
    if (!plantId || plantId === 'global') {
      throw new BadRequestException('Mill (plantId) is required — Arthiya is mill-scoped');
    }

    const existing = await this.prisma.supplier.findFirst({
      where: { plantId, name: cleanName },
    });
    if (existing) {
      throw new BadRequestException(
        `Arthiya "${cleanName}" already exists for this mill. Same name is allowed in other mills as a separate entry.`,
      );
    }

    return this.prisma.supplier.create({
      data: {
        name: cleanName,
        contact,
        email,
        address,
        firmNames: firmNames || [],
        mandi,
        status: 'ACTIVE',
        plantId,
      },
      include: { plant: { select: { id: true, name: true } } },
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
    const { startDate, endDate, supplierId, status, page, limit } = filters;
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

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, batches] = await this.prisma.$transaction([
      this.prisma.procurementBatch.count({ where }),
      this.prisma.procurementBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: { supplier: true, quality: true, weighbridge: true, paddyInwardDetails: true }
      })
    ]);

    const mappedData = batches.map((b: any) => ({
      id: b.id,
      purchaseNo: b.id.substring(0, 18),
      date: b.createdAt.toISOString().replace('T', ' ').substring(0, 10),
      supplier: b.supplier?.name || b.weighbridge?.supplierName || 'Unknown',
      netWeight: b.netWeight,
      amount: b.netAmount,
      status: b.status,
      inwardDetails: b.paddyInwardDetails || null
    }));
    
    return { data: mappedData, total };
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

  // ---------------------------------------------------------------------------
  // Feedback 32 — Boli Record helpers
  // ---------------------------------------------------------------------------

  private calcBoliPayment(govtRate: number, boliRate: number, finalBags: number | null | undefined) {
    if (finalBags == null || !Number.isFinite(finalBags)) return 0;
    const diff = (govtRate || 0) - (boliRate || 0);
    return diff * (finalBags * 0.375);
  }

  private async nextBoliNo(tx: any, plantId: string): Promise<string> {
    const plant = await tx.plant.update({
      where: { id: plantId },
      data: { nextBoliSeq: { increment: 1 } },
      select: { code: true, nextBoliSeq: true },
    });
    const seq = plant.nextBoliSeq - 1;
    const code = (plant.code || 'MILL').replace(/\s+/g, '').toUpperCase().slice(0, 8);
    return `${code}-B${String(seq).padStart(4, '0')}`;
  }

  private async notifyAdmin(tx: any, userId: string | undefined, action: string, details: string, entityId?: string, plantId?: string) {
    const db = tx || this.prisma;
    if (userId) {
      try {
        await db.systemAuditLog.create({
          data: {
            userId,
            action,
            module: 'Procurement',
            details,
            entityId,
            plantId,
          },
        });
      } catch { /* audit optional if userId invalid */ }
    }
    // Feedback 32/33 — real Admin bell notifications (not audit-only)
    const title =
      action === 'INFORM_BAUJI_EXCESS_WEIGHT' || action === 'INFORM_BAUJI_BAGS_LESS'
        ? 'Inform Bauji — Admin Alert'
        : action.startsWith('BOLI_')
          ? 'Boli Record — Admin Alert'
          : 'Procurement — Admin Alert';
    for (const role of ['SUPER_ADMIN', 'PLANT_MANAGER']) {
      try {
        await db.notification.create({
          data: {
            title,
            message: details,
            type: 'ALERT',
            role,
          },
        });
      } catch { /* ignore */ }
    }
  }

  /** Feedback 32 — same supervisor fingerprint: require successful capture + same RD device */
  private assertSameSupervisorFingerprint(existingBio: string | null | undefined, incomingBio: string | undefined, isAdmin: boolean) {
    if (isAdmin && (!incomingBio || incomingBio === 'ADMIN_BYPASS')) return;
    if (!incomingBio || incomingBio === 'ADMIN_BYPASS') {
      throw new BadRequestException("Require the supervisor's fingerprint who filled the Estimate Purchase");
    }
    if (!String(incomingBio).includes('errCode="0"') && !String(incomingBio).includes("errCode='0'")) {
      // Allow non-XML admin test tokens only for admins (handled above)
      if (!isAdmin && !String(incomingBio).includes('<Pid') && !String(incomingBio).includes('<Resp')) {
        // Still accept raw PID XML without errCode attr if DeviceInfo present
        if (!/dc=|mi=|DeviceInfo|hmac/i.test(String(incomingBio))) {
          throw new BadRequestException('Invalid fingerprint capture — please scan again');
        }
      }
    }
    if (!existingBio || existingBio === 'ADMIN_BYPASS') return; // first capture baseline
    const extractDc = (xml: string) => {
      const m =
        String(xml).match(/\bdc=["']([^"']+)["']/i) ||
        String(xml).match(/\bmi=["']([^"']+)["']/i) ||
        String(xml).match(/\bhmac=["']([^"']+)["']/i);
      return m?.[1] || null;
    };
    const a = extractDc(existingBio);
    const b = extractDc(incomingBio);
    if (a && !b) {
      throw new BadRequestException(
        'Fingerprint device id missing on new scan — use the same Morpho RD device as Estimate Purchase',
      );
    }
    if (a && b && a !== b) {
      throw new BadRequestException(
        'Fingerprint device mismatch — update must use the same supervisor fingerprint/device used on Estimate Purchase',
      );
    }
  }

  private isAdminRole(user: any) {
    const role = user?.role?.name || user?.role || '';
    return /SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(String(role));
  }

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private isSameCalendarDay(a?: Date | null, b?: Date | null) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async getSodaPendingById(id: string) {
    const p = await this.prisma.paddySodaPending.findUnique({
      where: { id },
      include: { supplier: true, bolis: { orderBy: { createdAt: 'asc' } } },
    });
    if (!p) throw new BadRequestException('Estimate Purchase not found');
    return {
      id: p.id,
      supplierId: p.supplierId,
      partyMandi: p.supplier.name,
      mandi: p.supplier.mandi || '',
      date: p.date,
      mc: p.moisture,
      bags: p.bags,
      rate: p.rate,
      govtRate: p.govtRate,
      bolis: p.bolis.map((b) => ({
        ...b,
        estimatedBags: b.bags,
        bagsRecInSoda: b.bagsReceived,
      })),
      diff: p.diff,
      payment: p.payment,
      note: p.note,
      finalHisabAmt: p.finalHisabAmt,
      riceCategory: p.riceCategory,
      supervisorName: p.supervisorName,
      supervisorUserId: p.supervisorUserId,
      cancelCount: p.cancelCount,
      dailyUpdateCount: p.dailyUpdateCount,
      plantId: p.plantId,
    };
  }

  /** Flattened mill-wise Boli register (Table 01) */
  async getBoliRecords(
    plantId: string,
    opts: {
      dateFrom?: string;
      dateTo?: string;
      mandi?: string;
      supplierId?: string;
      page?: string;
      limit?: string;
    } = {},
  ) {
    const whereSoda: any = plantId === 'global' ? {} : { plantId };
    if (opts.supplierId) whereSoda.supplierId = opts.supplierId;
    if (opts.dateFrom || opts.dateTo) {
      whereSoda.date = {};
      if (opts.dateFrom) whereSoda.date.gte = new Date(opts.dateFrom);
      if (opts.dateTo) {
        const to = new Date(opts.dateTo);
        to.setHours(23, 59, 59, 999);
        whereSoda.date.lte = to;
      }
    }
    if (opts.mandi) {
      whereSoda.supplier = { mandi: { equals: opts.mandi, mode: 'insensitive' } };
    }

    const sodas = await this.prisma.paddySodaPending.findMany({
      where: whereSoda,
      include: {
        supplier: true,
        bolis: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ supplier: { name: 'asc' } }, { date: 'asc' }],
    });

    const rows: any[] = [];
    for (const s of sodas) {
      const govtRate = s.govtRate ?? 0;
      const bolis = s.bolis || [];
      // Feedback 32 — Final Hisab (I) = compounding/running sum of Payment (H) in boli order
      let runningHisab = 0;

      for (const b of bolis) {
        const finalBags = b.finalBags;
        const received = b.bagsReceived || 0;
        const balance = finalBags != null ? finalBags - received : null;
        const payment = b.payment ?? this.calcBoliPayment(govtRate, b.rate, b.finalBags);
        runningHisab += payment || 0;
        rows.push({
          id: b.id,
          boliId: b.id,
          sodaId: s.id,
          supplierId: s.supplierId,
          partyName: s.supplier.name,
          mandi: s.supplier.mandi || '',
          date: s.date,
          boliNo: b.boliNo,
          moisture: b.moisture,
          estimatedBags: b.bags,
          finalBags: b.finalBags,
          rate: b.rate,
          govtRate,
          diff: govtRate - (b.rate || 0),
          payment,
          finalHisabAmt: runningHisab,
          bagsReceived: received,
          bagsRecInSoda: received,
          balanceBags: balance,
          isCompleted: b.isCompleted,
          isCancelled: b.isCancelled || b.bags === 0,
          artiaBillChecked: b.artiaBillChecked,
          note: s.note || '',
          supervisorName: s.supervisorName || '',
          riceCategory: s.riceCategory,
          sodaCompleted: bolis.length > 0 && bolis.every((x) => x.isCompleted || x.isCancelled || x.bags === 0),
        });
      }
    }

    const pageNum = parseInt(opts.page || '1', 10);
    const limitNum = parseInt(opts.limit || '10', 10);
    const total = rows.length;
    const start = (pageNum - 1) * limitNum;
    const data = rows.slice(start, start + limitNum);
    return { data, total };
  }

  async getSupervisorsForPlant(plantId: string) {
    const access = await this.prisma.userPlantAccess.findMany({
      where: { plantId },
      include: {
        user: { include: { role: true } },
      },
    });
    return access
      .map((a) => a.user)
      .filter((u) => u?.isActive && /SUPERVISOR/i.test(u.role?.name || ''))
      .map((u) => ({ id: u.id, username: u.username, role: u.role.name }));
  }

  /** Open bolis eligible for Add Final Boli (estimate done, finalBags not set, not cancelled) */
  async getOpenBolisForFinal(plantId: string) {
    const bolis = await this.prisma.paddyBoli.findMany({
      where: {
        finalBags: null,
        isCancelled: false,
        bags: { gt: 0 },
        sodaPending: plantId === 'global' ? undefined : { plantId },
      },
      include: {
        sodaPending: { include: { supplier: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return bolis.map((b) => ({
      id: b.id,
      boliNo: b.boliNo,
      moisture: b.moisture,
      estimatedBags: b.bags,
      rate: b.rate,
      artiaBillChecked: b.artiaBillChecked,
      supervisorName: b.sodaPending.supervisorName,
      artiaName: b.sodaPending.supplier.name,
      mandi: b.sodaPending.supplier.mandi || '',
      sodaId: b.sodaPendingId,
      date: b.sodaPending.date,
      govtRate: b.sodaPending.govtRate,
    }));
  }

  async submitFinalBoli(boliId: string, data: any, user?: any) {
    const artiaBillChecked = data.artiaBillChecked === true || data.artiaBillChecked === 'Yes' || data.artiaBillChecked === 'yes';
    if (!artiaBillChecked) {
      throw new BadRequestException('Artia Bill must be Checked and Matched (Yes) before submitting Final Bags');
    }
    if (!data.biometricData) {
      if (this.isAdminRole(user)) {
        data.biometricData = 'ADMIN_BYPASS';
      } else {
        throw new BadRequestException('Fingerprint is required to submit Final Boli');
      }
    }

    const finalBagsRaw = data.finalBags;
    const finalBags = typeof finalBagsRaw === 'number' ? finalBagsRaw : parseInt(String(finalBagsRaw), 10);
    if (!Number.isFinite(finalBags) || finalBags < 0 || finalBags > 999 || String(finalBagsRaw).includes('.')) {
      throw new BadRequestException('Final Bags must be a whole number from 0 to 999');
    }

    const boli = await this.prisma.paddyBoli.findUnique({
      where: { id: boliId },
      include: { sodaPending: { include: { supplier: true } } },
    });
    if (!boli) throw new BadRequestException('Boli not found');
    if (boli.isCancelled || boli.bags === 0) throw new BadRequestException('Cancelled boli cannot receive Final Bags');
    if (boli.finalBags != null) throw new BadRequestException('Final Bags already submitted for this Boli');

    // Feedback 32 — Final Boli must use same supervisor who filled Estimate (unless admin)
    if (
      !this.isAdminRole(user) &&
      boli.sodaPending.supervisorName &&
      data.supervisorName &&
      String(data.supervisorName).toLowerCase() !== String(boli.sodaPending.supervisorName).toLowerCase()
    ) {
      throw new BadRequestException(
        'Final Boli must be submitted by the same supervisor who filled the Estimate Purchase',
      );
    }

    const govtRate = boli.sodaPending.govtRate ?? 0;
    const payment = this.calcBoliPayment(govtRate, boli.rate, finalBags);
    const estimated = boli.bags || 0;
    const variance = estimated > 0 ? Math.abs(finalBags - estimated) / estimated : 0;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paddyBoli.update({
        where: { id: boliId },
        data: {
          finalBags,
          artiaBillChecked: true,
          payment,
        },
      });

      const siblings = await tx.paddyBoli.findMany({ where: { sodaPendingId: boli.sodaPendingId } });
      const sodaPayment = siblings.reduce((sum, b) => {
        const bags = b.id === boliId ? finalBags : b.finalBags;
        const pay = b.id === boliId ? payment : (b.payment ?? this.calcBoliPayment(govtRate, b.rate, bags));
        return sum + (pay || 0);
      }, 0);

      await tx.paddySodaPending.update({
        where: { id: boli.sodaPendingId },
        data: {
          payment: sodaPayment,
          finalHisabAmt: sodaPayment,
          biometricData: data.biometricData,
          supervisorName: data.supervisorName || boli.sodaPending.supervisorName,
        },
      });

      if (variance > 0.15) {
        await this.notifyAdmin(
          tx,
          user?.id,
          'BOLI_FINAL_BAGS_VARIANCE_15',
          `Admin alert: Final Bags ${finalBags} vs Estimated ${estimated} (>15%) for Boli ${boli.boliNo} / ${boli.sodaPending.supplier.name}`,
          boliId,
          boli.sodaPending.plantId,
        );
      }

      return updated;
    });
  }

  /** Feedback 32 — Admin can edit Payment / Note (and optional Final Bags) on Table 01 */
  async adminUpdateBoliRecord(
    boliId: string,
    data: { payment?: number; note?: string; finalBags?: number; rate?: number },
    user?: any,
  ) {
    if (!this.isAdminRole(user)) {
      throw new BadRequestException('Only Admin can edit Payment / Hisab / Note on Boli Record Table 01');
    }
    const boli = await this.prisma.paddyBoli.findUnique({
      where: { id: boliId },
      include: { sodaPending: true },
    });
    if (!boli) throw new BadRequestException('Boli not found');

    return this.prisma.$transaction(async (tx) => {
      const govtRate = boli.sodaPending.govtRate ?? 0;
      const nextFinal =
        data.finalBags != null && Number.isFinite(Number(data.finalBags))
          ? Number(data.finalBags)
          : boli.finalBags;
      const nextRate =
        data.rate != null && Number.isFinite(Number(data.rate)) ? Number(data.rate) : boli.rate;
      let payment =
        data.payment != null && Number.isFinite(Number(data.payment))
          ? Number(data.payment)
          : boli.payment ?? this.calcBoliPayment(govtRate, nextRate, nextFinal);
      // If admin changed finalBags/rate but not payment, recalculate payment from formula
      if (
        (data.finalBags != null || data.rate != null) &&
        (data.payment == null || !Number.isFinite(Number(data.payment)))
      ) {
        payment = this.calcBoliPayment(govtRate, nextRate, nextFinal);
      }

      await tx.paddyBoli.update({
        where: { id: boliId },
        data: {
          payment,
          ...(nextFinal != null ? { finalBags: nextFinal } : {}),
          ...(data.rate != null ? { rate: nextRate } : {}),
        },
      });

      if (data.note != null) {
        await tx.paddySodaPending.update({
          where: { id: boli.sodaPendingId },
          data: { note: String(data.note) },
        });
      }

      const siblings = await tx.paddyBoli.findMany({
        where: { sodaPendingId: boli.sodaPendingId },
        orderBy: { createdAt: 'asc' },
      });
      const sodaPayment = siblings.reduce((sum, b) => {
        const pay =
          b.id === boliId
            ? payment
            : b.payment ?? this.calcBoliPayment(govtRate, b.rate, b.finalBags);
        return sum + (pay || 0);
      }, 0);

      await tx.paddySodaPending.update({
        where: { id: boli.sodaPendingId },
        data: {
          payment: sodaPayment,
          finalHisabAmt: sodaPayment,
          ...(data.note != null ? { note: String(data.note) } : {}),
        },
      });

      return { ok: true, payment, sodaPayment };
    });
  }

  async completeBoli(boliId: string, data: any, user?: any) {
    const boli = await this.prisma.paddyBoli.findUnique({
      where: { id: boliId },
      include: { sodaPending: { include: { supplier: true } } },
    });
    if (!boli) throw new BadRequestException('Boli not found');
    if (boli.isCompleted) throw new BadRequestException('Boli already completed');
    if (boli.isCancelled || boli.bags === 0) throw new BadRequestException('Cancelled boli cannot be completed');
    if (boli.finalBags == null) throw new BadRequestException('Final Bags must be set before completing Boli');

    const extraToday = parseFloat(data.bagsRecToday) || 0;
    // bagsRecToday is ONLY the extra not yet applied via inward confirm; default 0 when completing after inward already updated bagsReceived
    const totalReceived = (boli.bagsReceived || 0) + (extraToday > 0 ? extraToday : 0);
    const finalBags = boli.finalBags;
    const balance = finalBags - totalReceived;
    const tolerance = 0.05 * finalBags;
    const outsideTolerance = Math.abs(balance) > tolerance;

    // PDF: balance cannot be less/more than 5% of Final Bags — block + Admin alert
    if (outsideTolerance) {
      await this.notifyAdmin(
        this.prisma,
        user?.id,
        'BOLI_COMPLETE_BALANCE_5PCT',
        `Admin alert: Complete blocked — Balance bags ${balance} outside 5% of Final Bags ${finalBags} (tol ±${tolerance.toFixed(2)}) for Boli ${boli.boliNo}`,
        boliId,
        boli.sodaPending.plantId,
      );
      throw new BadRequestException(
        `Cannot complete: balance ${balance} bags is outside ±5% of Final Bags (${finalBags}). Tolerance ±${Math.ceil(tolerance)} bags. Admin has been notified.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paddyBoli.update({
        where: { id: boliId },
        data: {
          bagsReceived: totalReceived,
          isCompleted: true,
        },
      });

      // View-only sodaCompleted: true when all non-cancelled bolis are completed
      const siblings = await tx.paddyBoli.findMany({ where: { sodaPendingId: boli.sodaPendingId } });
      const allDone = siblings.every(
        (b) => (b.id === boliId ? true : b.isCompleted) || b.isCancelled || b.bags === 0,
      );
      if (allDone) {
        await tx.paddySodaPending.update({
          where: { id: boli.sodaPendingId },
          data: { sodaCompleted: true },
        });
      }

      return {
        ...updated,
        balanceBags: balance,
        outsideTolerance: false,
        adminNotified: false,
      };
    });
  }

  // Paddy Soda Pending Aggregate Endpoint
  async getSodaPending(
    plantId: string,
    dateFrom?: string,
    dateTo?: string,
    page?: string,
    limit?: string,
    supplierId?: string,
    mandi?: string,
  ) {
    const whereClause: any = plantId === 'global' ? {} : { plantId };

    if (supplierId) whereClause.supplierId = supplierId;
    if (mandi) whereClause.supplier = { mandi: { equals: mandi, mode: 'insensitive' } };

    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        whereClause.date.lte = to;
      }
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, pending] = await this.prisma.$transaction([
      this.prisma.paddySodaPending.count({ where: whereClause }),
      this.prisma.paddySodaPending.findMany({
        where: whereClause,
        include: { supplier: true, bolis: { orderBy: { createdAt: 'asc' } } },
        orderBy: [{ supplier: { name: 'asc' } }, { date: 'asc' }],
        skip,
        take: limitNum,
      }),
    ]);

    const mappedData = pending.map((p) => {
      const bolis = (p.bolis || []).map((b) => ({
        ...b,
        estimatedBags: b.bags,
        bagsRecInSoda: b.bagsReceived,
        balanceBags: b.finalBags != null ? b.finalBags - (b.bagsReceived || 0) : null,
        isCancelled: b.isCancelled || b.bags === 0,
      }));
      return {
        id: p.id,
        supplierId: p.supplierId,
        partyMandi: p.supplier.name,
        mandi: p.supplier.mandi || '',
        date: p.date,
        mc: p.moisture,
        bags: p.bags,
        rate: p.rate,
        govtRate: p.govtRate,
        bolis,
        diff: p.diff,
        payment: p.payment,
        note: p.note,
        finalHisabAmt: p.finalHisabAmt,
        riceCategory: p.riceCategory,
        sodaCompleted: p.sodaCompleted,
        isCompleted: p.sodaCompleted,
        supervisorName: p.supervisorName,
        cancelCount: p.cancelCount,
        dailyUpdateCount: p.dailyUpdateCount,
      };
    });

    return { data: mappedData, total };
  }

  async createSodaPending(data: any, user?: any) {
    if (!data.biometricData) {
      if (this.isAdminRole(user)) {
        data.biometricData = 'ADMIN_BYPASS';
      } else {
        throw new BadRequestException('Fingerprint is required to submit Estimate Purchase');
      }
    }
    if (!data.supervisorName) {
      throw new BadRequestException('Supervisor Name is required');
    }

    const rawBolis = Array.isArray(data.bolis) ? data.bolis : [];
    // Skip empty rows; allow fewer than 4
    const bolisData = rawBolis
      .map((b: any) => {
        const bagsStr = b.bags === '' || b.bags == null ? null : String(b.bags).trim();
        const rateStr = b.rate === '' || b.rate == null ? null : String(b.rate).trim();
        if (bagsStr != null && /[.]/.test(bagsStr)) {
          throw new BadRequestException('Bags & Rate must be whole numbers (decimals not allowed)');
        }
        if (rateStr != null && /[.]/.test(rateStr)) {
          throw new BadRequestException('Bags & Rate must be whole numbers (decimals not allowed)');
        }
        return {
          moisture: b.moisture === '' || b.moisture == null ? null : parseFloat(b.moisture),
          bags: bagsStr == null ? null : parseInt(bagsStr, 10),
          rate: rateStr == null ? null : parseInt(rateStr, 10),
        };
      })
      .filter((b: any) => b.moisture != null || b.bags != null || b.rate != null);

    if (bolisData.length === 0) {
      throw new BadRequestException('At least one Boli row is required');
    }

    for (const b of bolisData) {
      if (b.bags == null || b.bags < 0 || b.bags > 999 || !Number.isInteger(b.bags)) {
        throw new BadRequestException('Bags must be a whole number 0–999 (use 0 to cancel a boli)');
      }
      if (b.rate == null || b.rate < 0 || !Number.isInteger(b.rate)) {
        throw new BadRequestException('Rate must be a whole number (no decimals)');
      }
      if (b.moisture == null || !Number.isFinite(b.moisture) || b.moisture < 0 || b.moisture > 99.99) {
        throw new BadRequestException('Moisture must be at most 2 digits with up to 2 decimals');
      }
      const mStr = String(b.moisture);
      if (!/^\d{1,2}(\.\d{1,2})?$/.test(mStr)) {
        throw new BadRequestException('Moisture format invalid (max 2 digits, 2 decimals)');
      }
    }

    const cancelCount = bolisData.filter((b: any) => b.bags === 0).length;
    if (cancelCount > 3) {
      await this.notifyAdmin(
        this.prisma,
        user?.id,
        'BOLI_CANCEL_LIMIT',
        `Further boli cancel attempted on create (count ${cancelCount}) for plant ${data.plantId}. Max 3 allowed. Admin review required.`,
        undefined,
        data.plantId,
      );
      throw new BadRequestException('Maximum 3 boli cancellations allowed. Message sent to Admin for further cancels.');
    }

    const activeBolis = bolisData.filter((b: any) => b.bags > 0);
    const totalBags = activeBolis.reduce((sum: number, b: any) => sum + b.bags, 0);
    const avgMoisture =
      activeBolis.length > 0
        ? activeBolis.reduce((sum: number, b: any) => sum + b.moisture, 0) / activeBolis.length
        : bolisData[0].moisture;
    const avgRate =
      activeBolis.length > 0
        ? activeBolis.reduce((sum: number, b: any) => sum + b.rate, 0) / activeBolis.length
        : bolisData[0].rate;

    if (data.updatePlantGovtRate && data.govtRate != null && data.govtRate !== '') {
      await this.prisma.plant.update({
        where: { id: data.plantId },
        data: { govtRate: parseFloat(data.govtRate) },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const createdBolis: any[] = [];
      for (const b of bolisData) {
        const boliNo = await this.nextBoliNo(tx, data.plantId);
        createdBolis.push({
          boliNo,
          moisture: b.moisture,
          bags: b.bags,
          rate: b.rate,
          isCancelled: b.bags === 0,
          payment: 0,
        });
      }

      const pending = await tx.paddySodaPending.create({
        data: {
          plantId: data.plantId,
          supplierId: data.supplierId,
          date: data.date ? new Date(data.date) : new Date(),
          moisture: avgMoisture,
          bags: totalBags,
          rate: avgRate,
          govtRate: parseFloat(data.govtRate) || 0,
          diff: parseFloat(data.diff) || 0,
          payment: 0,
          finalHisabAmt: 0,
          note: data.note || '',
          riceCategory: data.riceCategory || 'ANY',
          supervisorName: data.supervisorName,
          supervisorUserId: data.supervisorUserId || user?.id || null,
          biometricData: data.biometricData,
          cancelCount,
          dailyUpdateCount: 0,
          lastUpdateDate: new Date(),
          bolis: { create: createdBolis },
        },
        include: { bolis: true, supplier: true },
      });

      if (cancelCount > 0) {
        await this.notifyAdmin(
          tx,
          user?.id,
          'BOLI_CANCEL_ON_CREATE',
          `Estimate Purchase created with ${cancelCount} cancelled boli(s) (bags=0) for ${pending.supplier.name}`,
          pending.id,
          data.plantId,
        );
      }

      return pending;
    });
  }

  async updateSodaPending(id: string, data: any, user?: any) {
    const existing = await this.prisma.paddySodaPending.findUnique({
      where: { id },
      include: { bolis: true, supplier: true },
    });
    if (!existing) throw new BadRequestException('Estimate Purchase not found');

    const isAdmin = this.isAdminRole(user);
    const roleName = String(user?.role?.name || user?.role || '');
    // Feedback 32 — only SUPERVISOR (or admin) may edit; supervisor = current day only
    if (!isAdmin && !/SUPERVISOR/i.test(roleName)) {
      throw new BadRequestException('Only Supervisor or Admin can update Estimate Purchase');
    }
    const recordDate = new Date(existing.date);
    const today = this.startOfToday();
    if (!isAdmin && !this.isSameCalendarDay(recordDate, today)) {
      throw new BadRequestException('Supervisor can only edit current-day entries');
    }

    if (!data.biometricData) {
      if (this.isAdminRole(user)) {
        data.biometricData = 'ADMIN_BYPASS';
      } else {
        throw new BadRequestException("Require the supervisor's fingerprint who filled the Estimate Purchase when updating");
      }
    }

    this.assertSameSupervisorFingerprint(existing.biometricData, data.biometricData, isAdmin);

    // Same supervisor who owns the estimate (or admin)
    if (
      !isAdmin &&
      existing.supervisorName &&
      data.supervisorName &&
      String(data.supervisorName).toLowerCase() !== String(existing.supervisorName).toLowerCase()
    ) {
      throw new BadRequestException('Update must be submitted by the same supervisor who filled the Estimate Purchase');
    }

    // Max 2 updates per day
    const last = existing.lastUpdateDate;
    let dailyCount = existing.dailyUpdateCount || 0;
    if (!last || !this.isSameCalendarDay(last, new Date())) {
      dailyCount = 0;
    }
    if (!isAdmin && dailyCount >= 2) {
      throw new BadRequestException('Artia Boli record can be updated at most 2 times in one day');
    }

    // Feedback 32/33 — Estimate update cannot set Final Bags / Received / Complete
    // (those only via submitFinalBoli + completeBoli from Pending Bolis)
    const rawBolis = Array.isArray(data.bolis) ? data.bolis : [];
    const bolisData = rawBolis
      .map((b: any) => ({
        id: b.id,
        boliNo: b.boliNo,
        moisture: b.moisture === '' || b.moisture == null ? null : parseFloat(b.moisture),
        bags: b.bags === '' || b.bags == null ? null : parseInt(String(b.bags), 10),
        rate: b.rate === '' || b.rate == null ? null : parseInt(String(b.rate), 10),
      }))
      .filter((b: any) => b.moisture != null || b.bags != null || b.rate != null || b.id);

    if (bolisData.length === 0) {
      throw new BadRequestException('At least one Boli row is required');
    }

    for (const b of bolisData) {
      if (b.bags == null || b.bags < 0 || b.bags > 999 || !Number.isInteger(b.bags)) {
        throw new BadRequestException('Bags must be a whole number 0–999 (use 0 to cancel)');
      }
      if (b.rate == null || !Number.isInteger(b.rate)) {
        throw new BadRequestException('Rate must be a whole number (no decimals)');
      }
      if (b.moisture == null || b.moisture < 0 || b.moisture > 99.99) {
        throw new BadRequestException('Moisture must be at most 2 digits with up to 2 decimals');
      }
      const mStr = String(b.moisture);
      if (!/^\d{1,2}(\.\d{1,2})?$/.test(mStr)) {
        throw new BadRequestException('Moisture format invalid (max 2 digits, 2 decimals)');
      }
    }

    const prevCancel = existing.cancelCount || 0;
    const newCancelCount = bolisData.filter((b: any) => b.bags === 0).length;
    if (newCancelCount > 3 || (newCancelCount > prevCancel && prevCancel >= 3)) {
      await this.notifyAdmin(
        this.prisma,
        user?.id,
        'BOLI_CANCEL_LIMIT',
        `Further boli cancel attempted after max 3 for ${existing.supplier.name}. Admin review required.`,
        id,
        existing.plantId,
      );
      throw new BadRequestException('Max 3 boli cancellations reached. Message sent to Admin for further cancels.');
    }

    const activeBolis = bolisData.filter((b: any) => b.bags > 0);
    const totalBags = activeBolis.reduce((sum: number, b: any) => sum + b.bags, 0);
    const avgMoisture =
      activeBolis.length > 0
        ? activeBolis.reduce((sum: number, b: any) => sum + b.moisture, 0) / activeBolis.length
        : bolisData[0].moisture;
    const avgRate =
      activeBolis.length > 0
        ? activeBolis.reduce((sum: number, b: any) => sum + b.rate, 0) / activeBolis.length
        : bolisData[0].rate;

    if (data.updatePlantGovtRate && data.govtRate != null && data.govtRate !== '') {
      await this.prisma.plant.update({
        where: { id: data.plantId || existing.plantId },
        data: { govtRate: parseFloat(data.govtRate) },
      });
    }

    const govtRate = parseFloat(data.govtRate) || existing.govtRate || 0;

    return this.prisma.$transaction(async (tx) => {
      const existingById = new Map(existing.bolis.map((b) => [b.id, b]));
      const keptIds = new Set<string>();
      const upserted: any[] = [];

      for (let i = 0; i < bolisData.length; i++) {
        const b = bolisData[i];
        // Prefer explicit id; else match by position to preserve UUIDs
        const matched =
          (b.id && existingById.get(b.id)) ||
          (!b.id && existing.bolis[i] && !keptIds.has(existing.bolis[i].id) ? existing.bolis[i] : null);

        const existingBoli = matched || null;
        let boliNo = b.boliNo || existingBoli?.boliNo;
        if (!boliNo) {
          boliNo = await this.nextBoliNo(tx, existing.plantId);
        }

        // Preserve Final Bags / received / complete / bill-checked from dedicated flows only
        const finalBags = existingBoli?.finalBags ?? null;
        const bagsReceived = existingBoli?.bagsReceived || 0;
        const isCompleted = !!existingBoli?.isCompleted;
        const artiaBillChecked = !!existingBoli?.artiaBillChecked;
        const payment =
          finalBags != null ? this.calcBoliPayment(govtRate, b.rate, finalBags) : existingBoli?.payment || 0;

        const payload = {
          moisture: b.moisture,
          bags: b.bags,
          rate: b.rate,
          boliNo,
          finalBags,
          artiaBillChecked,
          payment,
          bagsReceived,
          isCompleted,
          isCancelled: b.bags === 0,
        };

        if (existingBoli) {
          keptIds.add(existingBoli.id);
          upserted.push(
            await tx.paddyBoli.update({
              where: { id: existingBoli.id },
              data: payload,
            }),
          );
        } else {
          upserted.push(
            await tx.paddyBoli.create({
              data: {
                sodaPendingId: id,
                ...payload,
              },
            }),
          );
        }
      }

      // Remove bolis dropped from the form (only those not kept)
      const toDelete = existing.bolis.filter((b) => !keptIds.has(b.id)).map((b) => b.id);
      if (toDelete.length) {
        await tx.paddyBoli.deleteMany({ where: { id: { in: toDelete } } });
      }

      const sodaPayment = upserted.reduce((sum, b) => sum + (b.payment || 0), 0);

      return tx.paddySodaPending.update({
        where: { id },
        data: {
          plantId: data.plantId || existing.plantId,
          supplierId: data.supplierId || existing.supplierId,
          date: data.date ? new Date(data.date) : undefined,
          moisture: avgMoisture,
          bags: totalBags,
          rate: avgRate,
          govtRate,
          diff: parseFloat(data.diff) || 0,
          payment: sodaPayment,
          finalHisabAmt: sodaPayment,
          note: data.note ?? existing.note,
          riceCategory: data.riceCategory || existing.riceCategory || 'ANY',
          supervisorName: data.supervisorName || existing.supervisorName,
          supervisorUserId: data.supervisorUserId || existing.supervisorUserId,
          biometricData: data.biometricData,
          cancelCount: newCancelCount,
          dailyUpdateCount: dailyCount + 1,
          lastUpdateDate: new Date(),
        },
        include: { bolis: true, supplier: true },
      });
    });
  }

  /** Admin-only adjustment — Payment/Hisab normally driven from Final Bags (Table 01) */
  async settleHisab(data: { id: string; payment: number; note: string; finalHisabAmt: number; userId?: string; user?: any }) {
    if (!this.isAdminRole(data.user)) {
      throw new BadRequestException(
        'Settle Hisab is Admin-only. Payment and Final Hisab are calculated from Final Bags (Add Final Boli).',
      );
    }
    return await this.prisma.$transaction(async (tx) => {
      const pending = await tx.paddySodaPending.findUnique({
        where: { id: data.id },
        include: { supplier: true },
      });

      if (!pending) {
        throw new Error('Pending Hisab record not found');
      }

      const updated = await tx.paddySodaPending.update({
        where: { id: data.id },
        data: {
          payment: data.payment,
          note: data.note,
          finalHisabAmt: data.finalHisabAmt,
        },
      });

      if (data.userId) {
        await tx.systemAuditLog.create({
          data: {
            userId: data.userId,
            action: 'SETTLE_HISAB',
            module: 'Procurement',
            details: `Settled Hisab for Supplier: ${pending.supplier.name}. Payment: ${data.payment}, Final Hisab Amt: ${data.finalHisabAmt}, Notes: ${data.note}`,
          },
        });
      }

      return updated;
    });
  }

  async getPaddyStockReport(plantId: string) {
    const inwards = await this.prisma.procurementBatch.findMany({
      where: {
        plantId: plantId === 'global' ? undefined : plantId,
        paddyInwardDetails: {
          isNot: null
        },
      },
      include: {
        supplier: true,
        gatePass: true,
        quality: true,
        paddyInwardDetails: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const dryPaddyOutputs = await this.prisma.byProduct.findMany({
      where: {
        name: 'Dry Paddy',
        targetStack: { not: null },
        batch: {
          plantId: plantId === 'global' ? undefined : plantId
        }
      },
      include: {
        batch: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const reportData: any[] = [];

    inwards.forEach(inward => {
      const details = inward.paddyInwardDetails;
      const gp = inward.gatePass;
      if (!details || !details.stackNo) return; // Only with stackNo

      reportData.push({
        id: inward.id,
        date: inward.createdAt,
        marka: (gp as any)?.variety || (details as any)?.marka || 'N/A',
        partyName: details?.partyName || (gp as any)?.partyName || inward.supplier?.name || 'N/A',
        brokerName: 'N/A', // No broker in gate pass usually, fallback to N/A
        totalBags: gp?.noOfBags || details?.totalBagsReceived || 0,
        wtPerBag: (details as any)?.weightPerBag || (gp as any)?.wtPerBag || 0,
        totalWtQtls: inward.netWeight ? inward.netWeight * 10 : 0, 
        moisture: details?.moisture || inward.quality?.moisture || (gp as any)?.moisture || 0,
        totalWtMt: inward.netWeight || 0,
        stackNo: details.stackNo,
        type: 'INWARD'
      });
    });

    dryPaddyOutputs.forEach(dp => {
      reportData.push({
        id: dp.id,
        date: dp.createdAt,
        marka: 'Dry Paddy',
        partyName: 'In-house Milling',
        brokerName: '-',
        totalBags: 0,
        wtPerBag: 0,
        totalWtQtls: dp.quantity ? dp.quantity * 10 : 0,
        moisture: dp.moisture || 0,
        totalWtMt: dp.quantity || 0,
        stackNo: dp.targetStack,
        type: 'DRY_PADDY'
      });
    });

    return reportData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getShortageSummaryReport(
    plantId: string,
    mandiId?: string,
    supplierId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const where: any = {
      ...(plantId && plantId !== 'global' ? { plantId } : {}),
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      paddyInwardDetails: { isNot: null },
    };

    if (mandiId || supplierId) {
      where.supplier = {};
      if (mandiId) where.supplier.mandi = mandiId;
      if (supplierId) where.supplier.id = supplierId;
    }

    if (dateFrom && dateTo) {
      where.createdAt = { gte: new Date(dateFrom), lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) };
    } else if (dateFrom) {
      where.createdAt = { gte: new Date(dateFrom) };
    } else if (dateTo) {
      where.createdAt = { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) };
    }

    const records = await this.prisma.procurementBatch.findMany({
      where,
      include: {
        paddyInwardDetails: true,
        supplier: true,
        gatePass: true,
        plant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const bagWtDefault = 0.382;
    const reportData: any[] = [];

    const explodeLedger = (r: any) => {
      const details = r.paddyInwardDetails;
      if (!details) return;
      const bagWt = details.standardBagWeight || bagWtDefault;
      const base = {
        detailsId: details.id,
        batchId: r.id,
        date: r.createdAt,
        millGp: details.gpNo || r.gatePass?.id || 'N/A',
        agencyGp: details.mandiEgNo || r.gatePass?.challanNo || 'N/A',
        truckNo: details.truckNo || r.gatePass?.vehicleNo || 'N/A',
        supplierId: r.supplierId,
        supplierName: r.supplier?.name || 'N/A',
        mandiName: details.mandi || r.supplier?.mandi || 'N/A',
        millName: r.plant?.name || 'Unknown',
        plantId: r.plantId,
      };

      let ledger: any[] = Array.isArray(details.shortageLedger) ? (details.shortageLedger as any[]) : [];
      if (!ledger.length) {
        // Backward-compatible explode from scalar fields
        if (details.qualityCutQtl > 0) {
          const isPct = details.qualityCutType === 'PERCENTAGE';
          ledger.push({
            type: 'QUALITY_CUT',
            direction: 'DEBIT',
            amountQtl: details.qualityCutQtl,
            narration: isPct
              ? `${details.qualityCutValue}% Quality Cut`
              : `${details.qualityCutValue} Bags Quality Cut`,
          });
        }
        if (details.bagsLessShortageQtl > 0) {
          const bags = Math.round(details.bagsLessShortageQtl / bagWt);
          ledger.push({
            type: 'BAGS_LESS',
            direction: 'DEBIT',
            amountQtl: details.bagsLessShortageQtl,
            narration: `${bags} Bags Shortage`,
          });
        }
        if (details.weightShortageQtl > 0) {
          ledger.push({
            type: 'WEIGHT_SHORTAGE',
            direction: 'DEBIT',
            amountQtl: details.weightShortageQtl,
            narration: 'Weight Shortage',
          });
        }
        const shortBags =
          (details.shortageAClass || 0) + (details.shortageBClass || 0);
        if (shortBags > 0) {
          ledger.push({
            type: 'SHORTAGE_BAGS_RECEIVED',
            direction: 'CREDIT',
            amountQtl: shortBags * bagWt,
            amountBags: shortBags,
            narration: `${shortBags} Bags Shortage Received`,
          });
        }
        // Excess weight recovery only for the remainder after auto shortage-bags credit
        if (details.informBaujiExcessWeight) {
          const autoCredit = shortBags * bagWt;
          const excessOnly = Math.max(0, (details.shortageRecoveryQtl || 0) - autoCredit);
          if (excessOnly > 0.001) {
            ledger.push({
              type: 'EXCESS_WEIGHT',
              direction: 'CREDIT',
              amountQtl: excessOnly,
              narration: 'Excess Weight Received',
            });
          } else if (!shortBags && (details.shortageRecoveryQtl || 0) > 0) {
            ledger.push({
              type: 'EXCESS_WEIGHT',
              direction: 'CREDIT',
              amountQtl: details.shortageRecoveryQtl,
              narration: 'Excess Weight Received',
            });
          }
        }
      }

      if (!ledger.length) {
        const shortage = details.shortageQtl || 0;
        const recovery = details.shortageRecoveryQtl || 0;
        if (!shortage && !recovery) return;
        if (shortage > 0) {
          ledger.push({
            type: 'SHORTAGE',
            direction: 'DEBIT',
            amountQtl: shortage,
            narration: details.shortageNarration || 'Shortage',
          });
        }
        if (recovery > 0) {
          ledger.push({
            type: 'RECOVERY',
            direction: 'CREDIT',
            amountQtl: recovery,
            narration: 'Shortage Recovery',
          });
        }
      }

      // Feedback 34: one row per ledger type (same truck credentials) — double-entry effect
      ledger.forEach((entry, idx) => {
        const amountQtl = Number(entry.amountQtl) || 0;
        const signed = entry.direction === 'CREDIT' ? -amountQtl : amountQtl;
        reportData.push({
          id: `${details.id}:${entry.type || idx}`,
          ...base,
          entryType: entry.type,
          direction: entry.direction,
          amountQtl: parseFloat(amountQtl.toFixed(2)),
          amountBags: parseFloat(
            (entry.amountBags != null ? Number(entry.amountBags) : amountQtl / bagWt).toFixed(2),
          ),
          shortageNarration: entry.narration || '',
          // Compat fields for older UI
          qualityCutQtl: entry.type === 'QUALITY_CUT' ? amountQtl : 0,
          weightShortageQtl: entry.type === 'WEIGHT_SHORTAGE' ? amountQtl : 0,
          bagsLessShortageQtl: entry.type === 'BAGS_LESS' ? amountQtl : 0,
          shortageQtl: entry.direction === 'DEBIT' ? amountQtl : 0,
          shortageRecoveryQtl: entry.direction === 'CREDIT' ? amountQtl : 0,
          netShortageQtl: parseFloat(signed.toFixed(2)),
          netShortageBags: parseFloat((signed / bagWt).toFixed(2)),
          informBaujiBagsLess: !!details.informBaujiBagsLess,
          informBaujiExcessWeight: !!details.informBaujiExcessWeight,
        });
      });
    };

    records.forEach(explodeLedger);
    return reportData;
  }

  /** Feedback 34 — till-date Artia shortage balances (qtl + bags) per mill */
  async getArtiaShortageBalances(asOfDate?: string) {
    const asOf = asOfDate ? new Date(new Date(asOfDate).setHours(23, 59, 59, 999)) : new Date();
    const bagWt = 0.382;
    const records = await this.prisma.procurementBatch.findMany({
      where: {
        // Production: only confirmed/completed inwards — never PENDING drafts
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { lte: asOf },
        paddyInwardDetails: { isNot: null },
      },
      include: { paddyInwardDetails: true, supplier: true, plant: true },
    });

    const map = new Map<string, any>();
    for (const r of records) {
      const d = r.paddyInwardDetails;
      if (!d) continue;
      const key = `${r.plantId}|${r.supplierId || 'none'}|${d.mandi || r.supplier?.mandi || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          plantId: r.plantId,
          millName: r.plant?.name || 'Unknown',
          supplierId: r.supplierId,
          artia: r.supplier?.name || 'Walk-in',
          mandi: d.mandi || r.supplier?.mandi || '-',
          shortageQtl: 0,
          recoveryQtl: 0,
        });
      }
      const row = map.get(key);
      const ledger = Array.isArray(d.shortageLedger) ? (d.shortageLedger as any[]) : null;
      if (ledger?.length) {
        for (const e of ledger) {
          const amt = Number(e.amountQtl) || 0;
          if (e.direction === 'CREDIT') row.recoveryQtl += amt;
          else row.shortageQtl += amt;
        }
      } else {
        row.shortageQtl += d.shortageQtl || 0;
        row.recoveryQtl += d.shortageRecoveryQtl || 0;
      }
    }

    return Array.from(map.values())
      .map((r) => {
        const balanceQtl = parseFloat((r.shortageQtl - r.recoveryQtl).toFixed(2));
        return {
          ...r,
          shortageQtl: parseFloat(r.shortageQtl.toFixed(2)),
          recoveryQtl: parseFloat(r.recoveryQtl.toFixed(2)),
          balanceQtl,
          balanceBags: parseFloat((balanceQtl / bagWt).toFixed(2)),
        };
      })
      .filter((r) => Math.abs(r.balanceQtl) > 0.001 || r.shortageQtl > 0)
      .sort((a, b) => a.millName.localeCompare(b.millName) || a.artia.localeCompare(b.artia));
  }

  /** Feedback 34 — daily consolidated multi-mill (Goyal / Beas / Rajoa) till-date balances */
  async getDailyConsolidatedShortage(date?: string, preferSnapshot = true) {
    const asOf = date || new Date().toISOString().slice(0, 10);

    if (preferSnapshot) {
      let snap = await this.prisma.dailyShortageSnapshot.findUnique({
        where: { reportDate_plantId: { reportDate: asOf, plantId: 'global' } },
      });
      // Fallback: plant-scoped evening finalize before global write existed
      if (!snap?.payload) {
        snap = await this.prisma.dailyShortageSnapshot.findFirst({
          where: { reportDate: asOf },
          orderBy: { submittedAt: 'desc' },
        });
      }
      if (snap?.payload) {
        return {
          ...(snap.payload as any),
          fromSnapshot: true,
          submittedAt: snap.submittedAt,
          submittedBy: snap.submittedBy,
          source: snap.source,
        };
      }
    }

    const balances = await this.getArtiaShortageBalances(asOf);
    const mills = [
      { key: 'goyal', label: 'Goyal Agro', match: /goyal/i },
      { key: 'beas', label: 'Beas Agro', match: /beas/i },
      { key: 'rajoa', label: 'Rajoa Agro', match: /rajoa/i },
    ];

    const columns = mills.map((m) => {
      const rows = balances
        .filter((b) => m.match.test(b.millName || ''))
        .map((b, i) => ({
          sno: i + 1,
          artia: b.artia,
          mandi: b.mandi,
          shortageQtl: b.balanceQtl,
          shortageBags: b.balanceBags,
        }));
      const totalQtl = parseFloat(rows.reduce((s, r) => s + r.shortageQtl, 0).toFixed(2));
      const totalBags = parseFloat(rows.reduce((s, r) => s + r.shortageBags, 0).toFixed(2));
      return { ...m, rows, totalQtl, totalBags };
    });

    const others = balances.filter((b) => !mills.some((m) => m.match.test(b.millName || '')));
    const otherGroups: Record<string, any[]> = {};
    for (const b of others) {
      const name = b.millName || 'Other';
      if (!otherGroups[name]) otherGroups[name] = [];
      otherGroups[name].push(b);
    }
    for (const [name, list] of Object.entries(otherGroups)) {
      const rows = list.map((b, i) => ({
        sno: i + 1,
        artia: b.artia,
        mandi: b.mandi,
        shortageQtl: b.balanceQtl,
        shortageBags: b.balanceBags,
      }));
      columns.push({
        key: name.toLowerCase().replace(/\s+/g, '_'),
        label: name,
        match: /$/,
        rows,
        totalQtl: parseFloat(rows.reduce((s, r) => s + r.shortageQtl, 0).toFixed(2)),
        totalBags: parseFloat(rows.reduce((s, r) => s + r.shortageBags, 0).toFixed(2)),
      });
    }

    return {
      date: asOf,
      columns,
      grandTotalQtl: parseFloat(balances.reduce((s, b) => s + b.balanceQtl, 0).toFixed(2)),
      grandTotalBags: parseFloat(balances.reduce((s, b) => s + b.balanceBags, 0).toFixed(2)),
      artiaCount: balances.length,
      updatedAt: new Date().toISOString(),
      fromSnapshot: false,
    };
  }

  /** Feedback 34 — submit / freeze evening daily shortage report */
  async submitDailyShortageReport(opts: {
    date?: string;
    plantId?: string;
    submittedBy?: string;
    source?: string;
  }) {
    const reportDate = opts.date || new Date().toISOString().slice(0, 10);
    const plantId = opts.plantId || 'global';
    const live = await this.getDailyConsolidatedShortage(reportDate, false);
    const payload = {
      ...live,
      submittedAt: new Date().toISOString(),
      fromSnapshot: true,
    };

    const snap = await this.prisma.dailyShortageSnapshot.upsert({
      where: { reportDate_plantId: { reportDate, plantId } },
      create: {
        reportDate,
        plantId,
        payload,
        submittedBy: opts.submittedBy || null,
        source: opts.source || 'MANUAL',
      },
      update: {
        payload,
        submittedBy: opts.submittedBy || null,
        source: opts.source || 'MANUAL',
        submittedAt: new Date(),
      },
    });

    await this.prisma.notification.create({
      data: {
        title: 'Daily Shortage Report Submitted',
        message: `Shortage consolidated report for ${reportDate} submitted (${opts.source || 'MANUAL'}) by ${opts.submittedBy || 'System'}. Grand total: ${live.grandTotalQtl} qtl.`,
        type: 'INFO',
        role: 'SUPER_ADMIN',
      },
    });

    return { message: 'Daily shortage report submitted', snapshot: snap, report: payload };
  }

  /** Feedback 34 — which mill shortages are increasing (daily net debit trend) */
  async getMillShortageTrend(days = 14) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const records = await this.prisma.procurementBatch.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        createdAt: { gte: start, lte: end },
        paddyInwardDetails: { isNot: null },
      },
      include: { paddyInwardDetails: true, plant: true },
    });

    const byDayMill: Record<string, number> = {};
    const millNames = new Set<string>();

    for (const r of records) {
      const d = r.paddyInwardDetails;
      if (!d) continue;
      const day = r.createdAt.toISOString().slice(0, 10);
      const mill = r.plant?.name || 'Unknown';
      millNames.add(mill);
      let net = 0;
      const ledger = Array.isArray(d.shortageLedger) ? (d.shortageLedger as any[]) : null;
      if (ledger?.length) {
        for (const e of ledger) {
          const amt = Number(e.amountQtl) || 0;
          net += e.direction === 'CREDIT' ? -amt : amt;
        }
      } else {
        net = (d.shortageQtl || 0) - (d.shortageRecoveryQtl || 0);
      }
      const key = `${day}|${mill}`;
      byDayMill[key] = (byDayMill[key] || 0) + net;
    }

    const daysList: string[] = [];
    for (let i = 0; i < days; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      daysList.push(dt.toISOString().slice(0, 10));
    }

    const mills = Array.from(millNames).sort();
    const series = daysList.map((day) => {
      const point: any = { date: day };
      for (const mill of mills) {
        point[mill] = parseFloat((byDayMill[`${day}|${mill}`] || 0).toFixed(2));
      }
      return point;
    });

    // Slope / increasing flag per mill (last half vs first half)
    const trends = mills.map((mill) => {
      const vals = series.map((s) => Number(s[mill]) || 0);
      const mid = Math.floor(vals.length / 2);
      const first = vals.slice(0, mid).reduce((a, b) => a + b, 0);
      const second = vals.slice(mid).reduce((a, b) => a + b, 0);
      return {
        mill,
        totalQtl: parseFloat(vals.reduce((a, b) => a + b, 0).toFixed(2)),
        increasing: second > first,
        deltaQtl: parseFloat((second - first).toFixed(2)),
      };
    });

    return { days: daysList, mills, series, trends };
  }

  async updateShortageRecovery(inwardDetailsId: string, shortageRecoveryQtl: number) {
    const details = await this.prisma.paddyInwardDetails.findUnique({
      where: { id: inwardDetailsId },
    });
    if (!details) throw new BadRequestException('Inward details not found');

    const bagWt = details.standardBagWeight || 0.382;
    let ledger: any[] = Array.isArray(details.shortageLedger)
      ? [...(details.shortageLedger as any[])]
      : [];

    // Keep non-manual credits + debits; replace MANUAL_RECOVERY
    ledger = ledger.filter((e) => e.type !== 'MANUAL_RECOVERY');
    const autoCredit = ledger
      .filter((e) => e.direction === 'CREDIT')
      .reduce((s, e) => s + (Number(e.amountQtl) || 0), 0);
    const manualExtra = Math.max(0, Number(shortageRecoveryQtl) - autoCredit);
    if (manualExtra > 0) {
      ledger.push({
        type: 'MANUAL_RECOVERY',
        direction: 'CREDIT',
        amountQtl: parseFloat(manualExtra.toFixed(3)),
        amountBags: parseFloat((manualExtra / bagWt).toFixed(2)),
        narration: 'Shortage Recovery',
      });
    }

    const totalRecovery = ledger
      .filter((e) => e.direction === 'CREDIT')
      .reduce((s, e) => s + (Number(e.amountQtl) || 0), 0);

    return this.prisma.paddyInwardDetails.update({
      where: { id: inwardDetailsId },
      data: {
        shortageRecoveryQtl: totalRecovery,
        shortageLedger: ledger,
        shortageNarration: ledger.map((e) => e.narration).join('; '),
      },
    });
  }
  async transferStackToHoodi(plantId: string, data: any) {
        const transferBags = parseFloat(data.bags) || 0;
    
    await this.prisma.$transaction(async (tx) => {
      const stack = await tx.paddyStack.findUnique({
        where: { plantId_stackNo: { plantId, stackNo: data.stackNo } }
      });
      if (stack) {
        const newTotal = stack.totalBags - transferBags;
        const status = newTotal <= 0 ? 'EMPTY' : stack.status;
        await tx.paddyStack.update({
          where: { id: stack.id },
          data: { totalBags: newTotal, status }
        });
      }
      await tx.hoodiRecord.create({
        data: {
          plantId,
          sourceType: 'STACK_TRANSFER',
          date: new Date(),
          stackNo: data.stackNo,
          bags: transferBags,
          moisture: parseFloat(data.moisture) || null,
          unloadedBy: data.unloadedBy || 'System'
        }
      });
    });
    return { success: true };
  }

  async getHoodiReport(plantId: string, dateFrom?: string, dateTo?: string) {
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

    const records = await this.prisma.hoodiRecord.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
    
    return records;
  }

  async getStackLayout(plantId: string) {
    return this.prisma.paddyStack.findMany({
      where: { plantId },
      orderBy: { stackNo: 'asc' }
    });
  }

  async getActiveUnloadingTrucks(plantId: string) {
    // 1. First, find all stacks that are currently ACTIVE (not COMPLETED or EMPTY)
    const activeStacks = await this.prisma.paddyStack.findMany({
      where: {
        plantId,
        status: { notIn: ['COMPLETED', 'EMPTY'] }
      },
      select: { stackNo: true }
    });

    const activeStackNumbers = activeStacks.map(s => s.stackNo);

    if (activeStackNumbers.length === 0) return [];

    // 2. Fetch all procurement batches (trucks) assigned to those active stacks
    return this.prisma.procurementBatch.findMany({
      where: {
        plantId,
        paddyInwardDetails: { 
          stackNo: { in: activeStackNumbers } 
        }
      },
      include: {
        paddyInwardDetails: true,
        quality: true,
        supplier: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50 active trucks to prevent UI overload
    });
  }

  async getStackHistory(plantId: string, stackNo: string) {
    // Return all inward details for this stack
    const inwards = await this.prisma.procurementBatch.findMany({
      where: {
        plantId,
        paddyInwardDetails: { stackNo }
      },
      include: {
        paddyInwardDetails: true,
        quality: true,
        supplier: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Return hoodi transfers as well
    const transfers = await this.prisma.hoodiRecord.findMany({
      where: { plantId, stackNo, sourceType: 'STACK_TRANSFER' },
      orderBy: { date: 'desc' }
    });
    
    return { inwards, transfers };
  }

  async markStackComplete(plantId: string, stackNo: string) {
    return this.prisma.paddyStack.update({
      where: { plantId_stackNo: { plantId, stackNo } },
      data: { status: 'COMPLETED' }
    });
  }

  async sendStackToHoodi(plantId: string, stackNo: string, userId: string) {
    // 1. Calculate current balance
    const { inwards, transfers } = await this.getStackHistory(plantId, stackNo);
    let totalBags = 0;
    let totalWt = 0;
    
    inwards.forEach(record => {
      totalBags += Number(record.paddyInwardDetails?.bagsRecAtMill || 0);
      totalWt += Number(record.paddyInwardDetails?.netWtAtMill || 0);
    });
    
    transfers.forEach(record => {
      totalBags -= Number(record.bags || 0);
    });

    if (totalBags <= 0) {
      throw new Error("Stack is already empty");
    }

    // 2. Create negative Hoodi Record to zero out balance
    await this.prisma.hoodiRecord.create({
      data: {
        plantId,
        date: new Date(),
        bags: totalBags, // Pass as number directly
        moisture: Number(inwards[0]?.quality?.moisture || 0) || null,
        sourceType: 'STACK_TRANSFER',
        stackNo: stackNo,
        unloadedBy: 'System (Send to Hoodi)'
      }
    });

    // 3. Mark stack as empty
    return this.prisma.paddyStack.update({
      where: { plantId_stackNo: { plantId, stackNo } },
      data: { 
        status: 'EMPTY',
        totalBags: 0,
        totalWeight: 0 
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Feedback 35 — Inward List (Govt / Mill), evening submit, mandi dashboard
  // ---------------------------------------------------------------------------

  private mapInwardListRow(b: any, bagWt: number) {
    const d = b.paddyInwardDetails || {};
    const aRec = Number(d.aClassReceived || 0);
    const bRec = Number(d.bClassReceived || 0);
    const aGiven = Number(d.aClassGiven || 0);
    const bGiven = Number(d.bClassGiven || 0);
    const shortA = Number(d.shortageAClass || 0);
    const shortB = Number(d.shortageBClass || 0);
    const millBags = aRec + bRec; // excluding shortage
    const shortageBags = shortA + shortB;
    const totalMillBags = millBags + shortageBags || Number(d.bagsRecAtMill || 0);
    const agencyBags = aGiven + bGiven || Number(d.bagsAtAgencyGp || 0);
    const millNetActual = Number(d.netWtAtMill || b.netWeight || d.netWeightWb || 0);
    const requiredNet = Number(d.requiredNetWt || 0);
    const unloadAt =
      d.unloadingEndTime ||
      d.unloadingStartTime ||
      b.createdAt;
    // Prefer unload timestamp; fall back to entry date + timeOut / timeIn
    let unloadSort = unloadAt ? new Date(unloadAt).getTime() : 0;
    if (!unloadSort || Number.isNaN(unloadSort)) {
      const day = (d.entryDate || b.createdAt?.toISOString?.()?.slice(0, 10) || '').toString().slice(0, 10);
      const tod = (d.timeOut || d.timeIn || '00:00').toString().slice(0, 5);
      unloadSort = new Date(`${day}T${tod}:00`).getTime() || new Date(b.createdAt).getTime();
    }

    return {
      id: b.id,
      status: b.status,
      date: (d.entryDate || b.createdAt?.toISOString?.()?.slice(0, 10) || '').toString().slice(0, 10),
      rstNo: d.rstNo || '-',
      timeIn: d.timeIn || null,
      timeOut: d.timeOut || null,
      millGp: d.gpNo || '-',
      agencyGp: d.mandiEgNo || d.mandiParchiNo || '-',
      truckNo: d.truckNo || b.weighbridge?.vehicleNo || '-',
      mandi: d.mandi || '-',
      partyName: d.partyName || b.supplier?.name || 'Walk-in',
      artiaId: b.supplierId || null,
      artiaName: b.supplier?.name || 'Walk-in',
      moisture: d.moisture ?? b.quality?.moisture ?? null,
      aClassAgency: aGiven,
      bClassAgency: bGiven,
      aClassMill: aRec,
      bClassMill: bRec,
      aClassShortage: shortA,
      bClassShortage: shortB,
      // PDF Mill list: third A/B pair = total mill + shortage
      aClassTotal: aRec + shortA,
      bClassTotal: bRec + shortB,
      agencyBags,
      millBags,
      shortageBags,
      totalBags: totalMillBags,
      // Govt list: Mill Net Weight = total agency bags × bagWt
      govtMillNetWt: parseFloat((agencyBags * bagWt).toFixed(3)),
      requiredNetWt: requiredNet,
      millNetWt: millNetActual,
      // Surplus Plus/Minus = mill net − required (positive = surplus/excess)
      surplus: parseFloat((millNetActual - requiredNet).toFixed(3)),
      unloadAt,
      unloadSort,
      plantId: b.plantId,
      millName: b.plant?.name || 'Unknown',
      createdAt: b.createdAt,
    };
  }

  async getInwardListReport(opts: {
    plantId?: string;
    dateFrom?: string;
    dateTo?: string;
    mandi?: string;
    supplierId?: string;
    bagWt?: number;
    preferSnapshot?: boolean;
    date?: string;
  }) {
    const bagWt = opts.bagWt === 0.381 ? 0.381 : Number(opts.bagWt) || 0.382;
    const plantId = opts.plantId || 'global';
    const asOf = opts.date || new Date().toISOString().slice(0, 10);

    if (opts.preferSnapshot) {
      const snap = await this.prisma.dailyInwardListSnapshot.findUnique({
        where: { reportDate_plantId: { reportDate: asOf, plantId } },
      });
      if (snap?.payload) {
        return {
          ...(snap.payload as any),
          fromSnapshot: true,
          submittedAt: snap.submittedAt,
          submittedBy: snap.submittedBy,
          source: snap.source,
        };
      }
    }

    const where: any = {
      status: { in: ['CONFIRMED', 'COMPLETED', 'DRAFT', 'PENDING'] },
    };
    if (plantId !== 'global') where.plantId = plantId;
    if (opts.supplierId) where.supplierId = opts.supplierId;

    // Feedback 35 — filter by inward entryDate (not batch createdAt)
    const detailAnd: any[] = [];
    if (opts.mandi) {
      detailAnd.push({ mandi: { contains: opts.mandi, mode: 'insensitive' } });
    }
    if (opts.dateFrom || opts.dateTo) {
      detailAnd.push({
        entryDate: {
          ...(opts.dateFrom ? { gte: opts.dateFrom } : {}),
          ...(opts.dateTo ? { lte: opts.dateTo } : {}),
        },
      });
    }
    where.paddyInwardDetails =
      detailAnd.length > 0 ? { AND: detailAnd } : { isNot: null };

    const batches = await this.prisma.procurementBatch.findMany({
      where,
      include: {
        supplier: true,
        paddyInwardDetails: true,
        weighbridge: true,
        quality: true,
        plant: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rowsAll = batches
      .map((b) => this.mapInwardListRow(b, bagWt))
      // Feedback 35: unload sequence descending (actual mill unload order), then GP desc
      .sort((a, b) => {
        const ta = a.unloadSort || 0;
        const tb = b.unloadSort || 0;
        if (tb !== ta) return tb - ta;
        return String(b.millGp || '').localeCompare(String(a.millGp || ''), undefined, { numeric: true });
      });

    // Main report rows = confirmed/completed (drafts excluded from printed/submitted lists)
    const rows = rowsAll.filter((r) => r.status === 'CONFIRMED' || r.status === 'COMPLETED');
    const drafts = rowsAll.filter((r) => r.status === 'DRAFT' || r.status === 'PENDING');

    const confirmed = rows;
    const totals = {
      agencyBags: confirmed.reduce((s, r) => s + r.agencyBags, 0),
      millBags: confirmed.reduce((s, r) => s + r.millBags, 0),
      shortageBags: confirmed.reduce((s, r) => s + r.shortageBags, 0),
      totalBags: confirmed.reduce((s, r) => s + r.totalBags, 0),
      draftCount: drafts.length,
    };

    // Artia clusters (Latest → Oldest within each artia)
    const byArtia: Record<string, any[]> = {};
    for (const r of rows) {
      const key = r.artiaName || 'Unknown';
      if (!byArtia[key]) byArtia[key] = [];
      byArtia[key].push(r);
    }
    const artiaClusters = Object.entries(byArtia)
      // Feedback 35 — after finishing one artia then the next; order artias by latest unload first
      .sort(([, listA], [, listB]) => {
        const maxA = Math.max(...listA.map((r) => r.unloadSort || 0), 0);
        const maxB = Math.max(...listB.map((r) => r.unloadSort || 0), 0);
        if (maxB !== maxA) return maxB - maxA;
        return String(listA[0]?.artiaName || '').localeCompare(String(listB[0]?.artiaName || ''));
      })
      .map(([artiaName, list]) => {
        // Within artia: Latest → Oldest
        const sorted = [...list].sort((a, b) => {
          if ((b.unloadSort || 0) !== (a.unloadSort || 0)) return (b.unloadSort || 0) - (a.unloadSort || 0);
          return String(b.date || '').localeCompare(String(a.date || ''));
        });
        return {
          artiaName,
          artiaId: sorted[0]?.artiaId,
          rows: sorted,
          totals: {
            agencyBags: sorted.reduce((s, r) => s + r.agencyBags, 0),
            millBags: sorted.reduce((s, r) => s + r.millBags, 0),
            shortageBags: sorted.reduce((s, r) => s + r.shortageBags, 0),
            totalBags: sorted.reduce((s, r) => s + r.totalBags, 0),
          },
        };
      });

    // Group by date for print page-breaks
    const byDate: Record<string, any[]> = {};
    for (const r of rows) {
      const d = r.date || 'unknown';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(r);
    }
    const dateGroups = Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, list]) => ({
        date,
        rows: list,
        totals: {
          agencyBags: list.reduce((s, r) => s + r.agencyBags, 0),
          millBags: list.reduce((s, r) => s + r.millBags, 0),
          shortageBags: list.reduce((s, r) => s + r.shortageBags, 0),
          totalBags: list.reduce((s, r) => s + r.totalBags, 0),
        },
      }));

    let activeGps = 0;
    try {
      activeGps = await this.prisma.gatePass.count({
        where: {
          status: 'ACTIVE',
          ...(plantId !== 'global' ? { plantId } : {}),
        },
      });
    } catch { /* ignore */ }

    return {
      date: asOf,
      plantId,
      bagWt,
      fromSnapshot: false,
      activeGps,
      totals,
      rows,
      artiaClusters,
      dateGroups,
      govt: {
        title: 'Govt Inward List — As per Agency GP',
        totalBags: totals.agencyBags,
        rows: rows.map((r, i) => ({
          sno: i + 1,
          date: r.date,
          agencyGp: r.agencyGp,
          truckNo: r.truckNo,
          mandi: r.mandi,
          partyName: r.partyName,
          moisture: r.moisture,
          aClass: r.aClassAgency,
          bClass: r.bClassAgency,
          millNetWeight: r.govtMillNetWt,
          agencyBags: r.agencyBags,
          id: r.id,
          status: r.status,
        })),
      },
      mill: {
        title: 'Mill Inward List — As per Actual Bags Received',
        millBags: totals.millBags,
        shortageBags: totals.shortageBags,
        totalBags: totals.totalBags,
        rows: rows.map((r, i) => ({
          sno: i + 1,
          ...r,
        })),
        // Screen-only: drafts for Continue Draft (excluded from totals / evening snapshot)
        draftRows: drafts.map((r, i) => ({
          sno: rows.length + i + 1,
          ...r,
        })),
      },
      drafts,
    };
  }

  async getActiveGatePassCount(plantId?: string) {
    return {
      count: await this.prisma.gatePass.count({
        where: {
          status: 'ACTIVE',
          ...(plantId && plantId !== 'global' ? { plantId } : {}),
        },
      }),
    };
  }

  /** Feedback 35 — evening fingerprint submit of both Govt + Mill lists */
  async submitEveningInwardLists(opts: {
    plantId: string;
    date?: string;
    bagWt?: number;
    supervisorName?: string;
    biometricData?: string;
    source?: string;
    user?: any;
  }) {
    const isAdmin = this.isAdminRole(opts.user);
    this.assertSameSupervisorFingerprint(null, opts.biometricData, isAdmin);
    if (!opts.biometricData) {
      throw new BadRequestException('Fingerprint authentication is required to submit evening inward lists.');
    }
    // Supervisors cannot use ADMIN_BYPASS
    if (!isAdmin && opts.biometricData === 'ADMIN_BYPASS') {
      throw new BadRequestException('Supervisor fingerprint scan is required (admin bypass not allowed).');
    }
    const plantId = opts.plantId || 'global';
    const reportDate = opts.date || new Date().toISOString().slice(0, 10);
    const live = await this.getInwardListReport({
      plantId,
      dateFrom: reportDate,
      dateTo: reportDate,
      bagWt: opts.bagWt,
      preferSnapshot: false,
      date: reportDate,
    });
    const summary = await this.buildDailyInwardSummary(plantId, reportDate, opts.bagWt);
    const payload = {
      ...live,
      summary,
      submittedAt: new Date().toISOString(),
      fromSnapshot: true,
      confirmMessage:
        'Confirming that the manual entries completed matches the digital entries of the day',
    };

    const snap = await this.prisma.dailyInwardListSnapshot.upsert({
      where: { reportDate_plantId: { reportDate, plantId } },
      create: {
        reportDate,
        plantId,
        payload,
        submittedBy: opts.supervisorName || null,
        biometricOk: true,
        source: opts.source || 'EVENING_SUBMIT',
      },
      update: {
        payload,
        submittedBy: opts.supervisorName || null,
        biometricOk: true,
        source: opts.source || 'EVENING_SUBMIT',
        submittedAt: new Date(),
      },
    });

    // Also store global rollup when submitting a plant
    if (plantId !== 'global') {
      const globalLive = await this.getInwardListReport({
        plantId: 'global',
        dateFrom: reportDate,
        dateTo: reportDate,
        bagWt: opts.bagWt,
        preferSnapshot: false,
        date: reportDate,
      });
      const globalSummary = await this.buildDailyInwardSummary('global', reportDate, opts.bagWt);
      await this.prisma.dailyInwardListSnapshot.upsert({
        where: { reportDate_plantId: { reportDate, plantId: 'global' } },
        create: {
          reportDate,
          plantId: 'global',
          payload: { ...globalLive, summary: globalSummary, fromSnapshot: true },
          submittedBy: opts.supervisorName || null,
          biometricOk: true,
          source: opts.source || 'EVENING_SUBMIT',
        },
        update: {
          payload: { ...globalLive, summary: globalSummary, fromSnapshot: true },
          submittedBy: opts.supervisorName || null,
          biometricOk: true,
          source: opts.source || 'EVENING_SUBMIT',
          submittedAt: new Date(),
        },
      });
    }

    try {
      // Feedback 34 — evening inward submit also freezes daily shortage consolidated report
      await this.submitDailyShortageReport({
        date: reportDate,
        plantId: 'global',
        submittedBy: opts.supervisorName || opts.user?.username || 'Supervisor',
        source: 'EVENING_INWARD_SUBMIT',
      });
    } catch (e) {
      console.error('Evening shortage snapshot failed', e);
    }

    try {
      const plantLabel =
        plantId === 'global'
          ? 'All Mills'
          : (await this.prisma.plant.findUnique({ where: { id: plantId }, select: { name: true } }))
              ?.name || plantId;
      const msg = `Daily Paddy / Inward Summary for ${reportDate} (${plantLabel}) is ready under Procurement → Reports → Daily Inward Summary. Submitted by ${opts.supervisorName || 'Supervisor'}.`;
      await this.prisma.notification.create({
        data: {
          title: 'Daily Paddy Summary Sent to Mill',
          message: msg,
          type: 'INFO',
          role: 'SUPERVISOR',
        },
      });
      await this.prisma.notification.create({
        data: {
          title: 'Daily Paddy Summary Sent to Mill',
          message: msg,
          type: 'INFO',
          role: 'PLANT_MANAGER',
        },
      });
    } catch { /* ignore */ }

    return {
      message: 'Evening inward lists submitted. Daily shortage report also updated.',
      reportDate,
      plantId,
      submittedAt: snap.submittedAt,
      totals: live.totals,
      summary,
    };
  }

  async buildDailyInwardSummary(plantId: string, date: string, bagWt = 0.382) {
    const report = await this.getInwardListReport({
      plantId,
      dateFrom: date,
      dateTo: date,
      bagWt,
      preferSnapshot: false,
      date,
    });
    const confirmed = (report.rows || []).filter(
      (r: any) => r.status === 'CONFIRMED' || r.status === 'COMPLETED',
    );
    const byMandi: Record<string, any> = {};
    for (const r of confirmed) {
      const m = r.mandi || 'Unknown';
      if (!byMandi[m]) {
        byMandi[m] = { mandi: m, trucks: 0, agencyBags: 0, millBags: 0, shortageBags: 0, totalBags: 0 };
      }
      byMandi[m].trucks += 1;
      byMandi[m].agencyBags += r.agencyBags;
      byMandi[m].millBags += r.millBags;
      byMandi[m].shortageBags += r.shortageBags;
      byMandi[m].totalBags += r.totalBags;
    }
    return {
      date,
      plantId,
      totals: report.totals,
      activeGps: report.activeGps,
      mandiRows: Object.values(byMandi).sort((a: any, b: any) => a.mandi.localeCompare(b.mandi)),
      truckCount: confirmed.length,
      bagWt,
    };
  }

  async getDailyInwardSummary(plantId: string, date?: string) {
    const reportDate = date || new Date().toISOString().slice(0, 10);
    const pid = plantId || 'global';
    const snap = await this.prisma.dailyInwardListSnapshot.findUnique({
      where: { reportDate_plantId: { reportDate, plantId: pid } },
    });
    if (snap?.payload && (snap.payload as any).summary) {
      return {
        ...(snap.payload as any).summary,
        fromSnapshot: true,
        submittedAt: snap.submittedAt,
        submittedBy: snap.submittedBy,
      };
    }
    // Auto-generated live summary (no submit required to view)
    const live = await this.buildDailyInwardSummary(pid, reportDate);
    return { ...live, fromSnapshot: false };
  }

  /**
   * Feedback 35 — multi-mill mandi balance dashboard (bags).
   * Opening = cumulative completed lifting before date; Today = that day's completed; Total = sum.
   * Mandis with no lifting today show Today Arrival = 0.
   */
  async getMandiBalanceDashboard(date?: string) {
    const asOf = date || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(asOf);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(asOf);
    dayEnd.setHours(23, 59, 59, 999);

    const plants = await this.prisma.plant.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const mandiMaster = await this.prisma.mandi.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const allMandiNames = mandiMaster.map((m) => m.name);

    const batches = await this.prisma.procurementBatch.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        paddyInwardDetails: { isNot: null },
      },
      include: {
        paddyInwardDetails: true,
        plant: true,
        gatePass: true,
      },
    });

    // Prefer completed GPs only (Feedback 35 — whose GP have been completed)
    const isCompletedLift = (b: any) => {
      const gp = b.gatePass;
      return !!(gp && (gp.status === 'CLOSED' || gp.status === 'COMPLETED'));
    };

    const mills = [
      { key: 'goyal', label: 'Goyal Agro', match: /goyal/i },
      { key: 'beas', label: 'Beas Agro', match: /beas/i },
      { key: 'rajoa', label: 'Rajoa Agro', match: /rajoa/i },
    ];

    // Ensure mill columns exist even if plant names differ
    const millCols = mills.map((m) => {
      const plant = plants.find((p) => m.match.test(p.name));
      return { ...m, plantId: plant?.id, plantName: plant?.name || m.label };
    });

    // Collect mandi names from data + master
    const mandiSet = new Set<string>(allMandiNames);
    for (const b of batches) {
      const name = b.paddyInwardDetails?.mandi;
      if (name) mandiSet.add(name);
    }
    const mandiNames = Array.from(mandiSet).sort((a, b) => a.localeCompare(b));

    const bagOf = (b: any) => {
      const d = b.paddyInwardDetails || {};
      // Mandi lifting = Agency GP bags (govt side)
      return (
        Number(d.bagsAtAgencyGp || 0) ||
        Number(d.aClassGiven || 0) + Number(d.bClassGiven || 0) ||
        Number(d.bagsRecAtMill || 0) ||
        Number(d.aClassReceived || 0) +
          Number(d.bClassReceived || 0) +
          Number(d.shortageAClass || 0) +
          Number(d.shortageBClass || 0)
      );
    };

    /** Feedback 35 — bucket by GP completion time (gpCompleteDate), else GP updatedAt when CLOSED/COMPLETED, else batch createdAt */
    const liftCompletedAt = (b: any): Date => {
      const gp = b.gatePass;
      if (gp?.gpCompleteDate) return new Date(gp.gpCompleteDate);
      if (gp && (gp.status === 'CLOSED' || gp.status === 'COMPLETED') && gp.updatedAt) {
        return new Date(gp.updatedAt);
      }
      return new Date(b.createdAt);
    };

    const columns = millCols.map((m) => {
      const plantBatches = batches.filter(
        (b) =>
          isCompletedLift(b) &&
          (m.plantId ? b.plantId === m.plantId : m.match.test(b.plant?.name || '')),
      );
      const rows = mandiNames.map((mandiName) => {
        const forMandi = plantBatches.filter(
          (b) => (b.paddyInwardDetails?.mandi || '').toLowerCase() === mandiName.toLowerCase(),
        );
        const opening = forMandi
          .filter((b) => liftCompletedAt(b) < dayStart)
          .reduce((s, b) => s + bagOf(b), 0);
        const todayArrival = forMandi
          .filter((b) => {
            const t = liftCompletedAt(b);
            return t >= dayStart && t <= dayEnd;
          })
          .reduce((s, b) => s + bagOf(b), 0);
        return {
          mandi: mandiName,
          openingBalance: opening,
          todayArrival,
          total: opening + todayArrival,
        };
      });
      // Always show mandis (even 0 today) per feedback
      const totalOpening = rows.reduce((s, r) => s + r.openingBalance, 0);
      const totalToday = rows.reduce((s, r) => s + r.todayArrival, 0);
      return {
        ...m,
        rows,
        totals: {
          openingBalance: totalOpening,
          todayArrival: totalToday,
          total: totalOpening + totalToday,
        },
      };
    });

    return {
      date: asOf,
      unit: 'bags',
      autoGenerated: true,
      columns,
      updatedAt: new Date().toISOString(),
    };
  }
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const inventory_service_1 = require("../inventory/inventory.service");
let ProcurementService = class ProcurementService {
    constructor(prisma, inventoryService) {
        this.prisma = prisma;
        this.inventoryService = inventoryService;
    }
    async savePurchase(data) {
        const { plantId, supplierId, gatePassId, weighbridgeId, netWeight, ratePerQuintal, transportCharges, otherCharges, moisture, broken, discoloration, foreignMatter, inspectedBy, category, purchaseType, bugs, godown, biometricData } = data;
        const parsedNetWeight = parseFloat(netWeight) || 0;
        const parsedRate = parseFloat(ratePerQuintal) || 0;
        const parsedTransport = parseFloat(transportCharges) || 0;
        const parsedOther = parseFloat(otherCharges) || 0;
        const parsedMoisture = parseFloat(moisture) || 0;
        const parsedBugs = parseFloat(bugs) || 0;
        let finalRate = parsedRate;
        if (purchaseType === 'PADDY_BOLI') {
            let moistureDeduction = 0;
            if (parsedMoisture > 17) {
                moistureDeduction = (parsedMoisture - 17) * 10;
            }
            let bugsDeduction = parsedBugs * 5;
            finalRate = parsedRate - moistureDeduction - bugsDeduction;
        }
        const netWeightQuintals = parsedNetWeight * 10;
        const baseAmount = netWeightQuintals * finalRate;
        const totalAmount = baseAmount + parsedTransport + parsedOther;
        const incomingRstNum = data.rstNo ? parseInt(data.rstNo.replace(/\D/g, ''), 10) : null;
        const incomingMandiNum = (data.mandiEgpNo || data.mandiEgNo) ? parseInt((data.mandiEgpNo || data.mandiEgNo).replace(/\D/g, ''), 10) : null;
        if (incomingRstNum || incomingMandiNum) {
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
                            throw new common_1.BadRequestException(`RST Number must be in chronological sequence. Incoming: ${data.rstNo}, Last Saved: ${latestInward.rstNo}`);
                        }
                    }
                }
                if (incomingMandiNum && latestInward.mandiEgNo) {
                    const latestMandiNum = parseInt(latestInward.mandiEgNo.replace(/\D/g, ''), 10);
                    if (!isNaN(latestMandiNum) && !isNaN(incomingMandiNum)) {
                        if (incomingMandiNum <= latestMandiNum) {
                            throw new common_1.BadRequestException(`Mandi e-GP Number must be in chronological sequence. Incoming: ${data.mandiEgpNo || data.mandiEgNo}, Last Saved: ${latestInward.mandiEgNo}`);
                        }
                    }
                }
                const incomingParchiNum = data.mandiParchiNo ? parseInt(data.mandiParchiNo.replace(/\D/g, ''), 10) : null;
                if (incomingParchiNum && latestInward.mandiParchiNo) {
                    const latestParchiNum = parseInt(latestInward.mandiParchiNo.replace(/\D/g, ''), 10);
                    if (!isNaN(latestParchiNum) && !isNaN(incomingParchiNum)) {
                        if (incomingParchiNum <= latestParchiNum) {
                            throw new common_1.BadRequestException(`Mandi Parchi Number must be in chronological sequence. Incoming: ${data.mandiParchiNo}, Last Saved: ${latestInward.mandiParchiNo}`);
                        }
                    }
                }
            }
        }
        return this.prisma.$transaction(async (tx) => {
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
                    deductions: parsedRate - finalRate,
                    netAmount: totalAmount,
                    biometricData: biometricData || null,
                    status: 'PENDING',
                }
            });
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
                    govtRate: data.govtRate ? parseFloat(data.govtRate) : null,
                    standardBagWeight: data.standardBagWeight ? parseFloat(data.standardBagWeight) : null,
                    totalBagsCalculated: data.totalBagsCalculated ? parseFloat(data.totalBagsCalculated) : null,
                    standardWeightCalculated: data.standardWeightCalculated ? parseFloat(data.standardWeightCalculated) : null,
                    actualWeightReceived: data.actualWeightReceived ? parseFloat(data.actualWeightReceived) : null,
                    shortageQtl: data.shortageQtl ? parseFloat(data.shortageQtl) : null,
                    shortageBags: data.shortageBags ? parseFloat(data.shortageBags) : null,
                    aClassGiven: data.aClassGiven ? parseFloat(data.aClassGiven) : null,
                    aClassReceived: data.aClassReceived ? parseFloat(data.aClassReceived) : null,
                    aClassPending: data.aClassPending ? parseFloat(data.aClassPending) : null,
                    bClassGiven: data.bClassGiven ? parseFloat(data.bClassGiven) : null,
                    bClassReceived: data.bClassReceived ? parseFloat(data.bClassReceived) : null,
                    bClassPending: data.bClassPending ? parseFloat(data.bClassPending) : null,
                    autoConvertedToBClass: data.autoConvertedToBClass ? parseFloat(data.autoConvertedToBClass) : null,
                }
            });
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
            if (data.boliInputs && Object.keys(data.boliInputs).length > 0) {
                for (const [boliId, bagsRec] of Object.entries(data.boliInputs)) {
                    const received = parseFloat(bagsRec);
                    if (received > 0) {
                        const boli = await tx.paddyBoli.findUnique({ where: { id: boliId } });
                        if (boli) {
                            const newTotal = boli.bagsReceived + received;
                            const isCompleted = newTotal >= (boli.bags * 0.98);
                            await tx.paddyBoli.update({
                                where: { id: boliId },
                                data: { bagsReceived: newTotal, isCompleted }
                            });
                        }
                    }
                }
            }
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
            return batch;
        });
    }
    async getInwards(plantId, dateFrom, dateTo) {
        const whereClause = plantId === 'global' ? {} : { plantId };
        if (dateFrom || dateTo) {
            whereClause.createdAt = {};
            if (dateFrom)
                whereClause.createdAt.gte = new Date(dateFrom);
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
            netWt: b.netWeight || b.paddyInwardDetails?.netWtAtParty || b.paddyInwardDetails?.netWtAtMill || '-',
        }));
    }
    async getInwardDetails(batchId) {
        const batch = await this.prisma.procurementBatch.findUnique({
            where: { id: batchId },
            include: {
                supplier: true,
                paddyInwardDetails: true,
                weighbridge: true,
                quality: true,
            }
        });
        if (!batch)
            throw new Error('Inward record not found');
        return batch;
    }
    async getRecentPurchases(plantId, dateFrom, dateTo) {
        const whereClause = plantId === 'global' ? {} : { plantId };
        if (dateFrom || dateTo) {
            whereClause.createdAt = {};
            if (dateFrom)
                whereClause.createdAt.gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                whereClause.createdAt.lte = to;
            }
        }
        const batches = await this.prisma.procurementBatch.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: dateFrom || dateTo ? 100 : 5,
            include: {
                supplier: true,
                quality: true,
                weighbridge: true,
                paddyInwardDetails: true
            }
        });
        return batches.map((b) => ({
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
    async getBatch(batchId) {
        return this.prisma.procurementBatch.findFirst({
            where: { id: { startsWith: batchId } },
            include: { supplier: true, weighbridge: true, quality: true, paddyInwardDetails: true }
        });
    }
    async updateQuality(batchId, data) {
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
                    status: status,
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
    async createSupplier(data) {
        const { name, contact, email, address, firmNames, mandi, plantId } = data;
        return this.prisma.supplier.create({
            data: {
                name,
                contact,
                email,
                address,
                firmNames: firmNames || [],
                mandi,
                status: 'Active',
                ...(plantId ? { plantId } : {})
            }
        });
    }
    async getOccupiedStacks(plantId) {
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
        const stackMap = {};
        batches.forEach(b => {
            const stack = b.stackNo;
            if (!stack)
                return;
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
                if (m > stackMap[stack].maxMoisture)
                    stackMap[stack].maxMoisture = m;
                if (m < stackMap[stack].minMoisture)
                    stackMap[stack].minMoisture = m;
            }
        });
        Object.keys(stackMap).forEach(key => {
            if (stackMap[key].moistureCount > 0) {
                stackMap[key].moisture = Number((stackMap[key].totalMoisture / stackMap[key].moistureCount).toFixed(2));
            }
            else {
                stackMap[key].minMoisture = 0;
            }
            if (stackMap[key].minMoisture === 999)
                stackMap[key].minMoisture = 0;
            delete stackMap[key].totalMoisture;
            delete stackMap[key].moistureCount;
        });
        return stackMap;
    }
    async getAnalytics(plantId) {
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
    async getPurchaseRegister(plantId, filters) {
        const { startDate, endDate, supplierId, status } = filters;
        const where = { plantId };
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
        return batches.map((b) => ({
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
    async updateBoliRate(batchId, newRate, arhtiaCorrection) {
        const batch = await this.prisma.procurementBatch.findUnique({
            where: { id: batchId }
        });
        if (!batch)
            throw new common_1.BadRequestException('Batch not found');
        if (batch.purchaseType !== 'PADDY_BOLI')
            throw new common_1.BadRequestException('Can only update rates for Boli purchases');
        if (!batch.baseRate)
            throw new common_1.BadRequestException('Base rate not found for this batch');
        const variance = Math.abs(batch.baseRate - newRate);
        const maxAllowedVariance = batch.baseRate * 0.20;
        if (variance > maxAllowedVariance) {
            throw new common_1.BadRequestException(`Rate correction exceeds maximum allowed 20% variance. Max allowed variance is ${maxAllowedVariance}.`);
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
    async getSodaPending(plantId, dateFrom, dateTo) {
        const whereClause = plantId === 'global' ? {} : { plantId };
        if (dateFrom || dateTo) {
            whereClause.date = {};
            if (dateFrom)
                whereClause.date.gte = new Date(dateFrom);
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
    async createSodaPending(data) {
        const bolisData = data.bolis && Array.isArray(data.bolis) && data.bolis.length > 0 ? data.bolis : [
            { moisture: parseFloat(data.moisture) || 0, bags: parseFloat(data.bags) || 0, rate: parseFloat(data.rate) || 0 }
        ];
        const totalBags = bolisData.reduce((sum, b) => sum + (parseFloat(b.bags) || 0), 0);
        const avgMoisture = bolisData.reduce((sum, b) => sum + (parseFloat(b.moisture) || 0), 0) / (bolisData.length || 1);
        const avgRate = bolisData.reduce((sum, b) => sum + (parseFloat(b.rate) || 0), 0) / (bolisData.length || 1);
        if (data.updatePlantGovtRate && data.govtRate) {
            await this.prisma.plant.update({
                where: { id: data.plantId },
                data: { govtRate: parseFloat(data.govtRate) }
            });
        }
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
                    create: bolisData.map((b) => ({
                        moisture: parseFloat(b.moisture) || 0,
                        bags: parseFloat(b.bags) || 0,
                        rate: parseFloat(b.rate) || 0
                    }))
                }
            }
        });
    }
    async updateSodaPending(id, data) {
        const bolisData = data.bolis && Array.isArray(data.bolis) && data.bolis.length > 0 ? data.bolis : [
            { moisture: parseFloat(data.moisture) || 0, bags: parseFloat(data.bags) || 0, rate: parseFloat(data.rate) || 0 }
        ];
        const totalBags = bolisData.reduce((sum, b) => sum + (parseFloat(b.bags) || 0), 0);
        const avgMoisture = bolisData.reduce((sum, b) => sum + (parseFloat(b.moisture) || 0), 0) / (bolisData.length || 1);
        const avgRate = bolisData.reduce((sum, b) => sum + (parseFloat(b.rate) || 0), 0) / (bolisData.length || 1);
        await this.prisma.paddyBoli.deleteMany({ where: { sodaPendingId: id } });
        if (data.updatePlantGovtRate && data.govtRate) {
            await this.prisma.plant.update({
                where: { id: data.plantId },
                data: { govtRate: parseFloat(data.govtRate) }
            });
        }
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
                    create: bolisData.map((b) => ({
                        moisture: parseFloat(b.moisture) || 0,
                        bags: parseFloat(b.bags) || 0,
                        rate: parseFloat(b.rate) || 0
                    }))
                }
            }
        });
    }
    async settleHisab(data) {
        return await this.prisma.$transaction(async (tx) => {
            const pending = await tx.paddySodaPending.findUnique({
                where: { id: data.id },
                include: { supplier: true }
            });
            if (!pending) {
                throw new Error('Pending Hisab record not found');
            }
            const updated = await tx.paddySodaPending.update({
                where: { id: data.id },
                data: {
                    payment: data.payment,
                    note: data.note,
                    finalHisabAmt: data.finalHisabAmt
                }
            });
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
};
exports.ProcurementService = ProcurementService;
exports.ProcurementService = ProcurementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, inventory_service_1.InventoryService])
], ProcurementService);
//# sourceMappingURL=procurement.service.js.map
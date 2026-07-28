"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DispatchFinanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const os = __importStar(require("os"));
let DispatchFinanceService = class DispatchFinanceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDispatchMetrics(plantId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const whereClause = plantId === 'all' ? {} : { plantId };
            const dispatches = await this.prisma.dispatch.findMany({
                where: whereClause,
            });
            const totalToday = dispatches.filter((d) => d.date >= today).reduce((acc, curr) => acc + curr.quantity, 0);
            const completed = dispatches.filter((d) => d.status === 'Completed').reduce((acc, curr) => acc + curr.quantity, 0);
            const inTransit = dispatches.filter((d) => d.status === 'In Transit').reduce((acc, curr) => acc + curr.quantity, 0);
            const pending = dispatches.filter((d) => d.status === 'Pending').reduce((acc, curr) => acc + curr.quantity, 0);
            return {
                totalToday,
                completed,
                inTransit,
                pending,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Failed to fetch dispatch metrics');
        }
    }
    async getAllDispatches(plantId) {
        const whereClause = plantId === 'all' ? {} : { plantId };
        return this.prisma.dispatch.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                gatePass: true
            }
        });
    }
    async createDispatch(plantId, data) {
        try {
            const count = await this.prisma.dispatch.count({ where: { plantId } });
            const dispatchNo = `DIS-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
            return await this.prisma.dispatch.create({
                data: {
                    plantId,
                    dispatchNo,
                    date: data.date ? new Date(data.date) : new Date(),
                    partyName: data.partyName,
                    item: data.item,
                    quantity: parseFloat(data.quantity),
                    status: 'Pending'
                }
            });
        }
        catch (error) {
            console.error('Error creating dispatch:', error);
            throw new common_1.InternalServerErrorException(error.message || 'Failed to create dispatch');
        }
    }
    async generateGatePass(plantId, data) {
        try {
            const dispatch = await this.prisma.dispatch.findUnique({
                where: { id: data.dispatchId }
            });
            if (!dispatch || dispatch.plantId !== plantId) {
                throw new common_1.InternalServerErrorException('Invalid dispatch record');
            }
            if (dispatch.gatePassId) {
                throw new common_1.InternalServerErrorException('Gate pass already generated for this dispatch');
            }
            return await this.prisma.$transaction(async (tx) => {
                const gatePass = await tx.gatePass.create({
                    data: {
                        plantId,
                        passType: 'OUTWARD',
                        purpose: 'DISPATCH',
                        vehicleNo: data.vehicleNo,
                        driverName: data.driverName,
                        contactNo: data.contactNo,
                        material: dispatch.item,
                        status: 'ACTIVE'
                    }
                });
                await tx.weighbridgeTransaction.create({
                    data: {
                        plantId,
                        vehicleNo: data.vehicleNo,
                        transactionType: 'OUTWARD',
                        driverName: data.driverName,
                        materialType: dispatch.item,
                        status: 'PENDING_TARE',
                        gatePassId: gatePass.id
                    }
                });
                await tx.dispatch.update({
                    where: { id: dispatch.id },
                    data: {
                        gatePassId: gatePass.id,
                        vehicleNo: data.vehicleNo,
                        status: 'In Transit'
                    }
                });
                return gatePass;
            });
        }
        catch (error) {
            console.error('Error generating gate pass:', error);
            throw new common_1.InternalServerErrorException(error.message || 'Failed to generate gate pass');
        }
    }
    async getWeightVerifications(plantId) {
        const whereClause = plantId === 'all' ? {} : { plantId };
        return this.prisma.weighbridgeTransaction.findMany({
            where: { ...whereClause, transactionType: 'OUTWARD' },
            include: {
                gatePass: {
                    include: {
                        dispatch: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async readWeighbridge(plantId) {
        const randomWeight = Math.floor(Math.random() * 20000) + 10000;
        return { weight: randomWeight, unit: 'kg', status: 'Stable' };
    }
    async createWeightEntry(plantId, data) {
        try {
            const transaction = await this.prisma.weighbridgeTransaction.findUnique({
                where: { id: data.transactionId },
                include: { gatePass: { include: { dispatch: true } } }
            });
            if (!transaction)
                throw new common_1.InternalServerErrorException('Transaction not found');
            return await this.prisma.$transaction(async (tx) => {
                const updatedTx = await tx.weighbridgeTransaction.update({
                    where: { id: transaction.id },
                    data: {
                        tareWeight: data.tareWeight,
                        grossWeight: data.grossWeight,
                        netWeight: data.netWeight,
                        tareTime: new Date(),
                        grossTime: new Date(),
                        status: 'COMPLETED'
                    }
                });
                const dispatch = transaction.gatePass?.dispatch;
                if (dispatch) {
                    await tx.dispatch.update({
                        where: { id: dispatch.id },
                        data: { status: 'Completed' }
                    });
                    const inventory = await tx.inventory.findFirst({
                        where: { plantId: transaction.plantId, itemType: dispatch.item }
                    });
                    if (inventory) {
                        await tx.inventory.update({
                            where: { id: inventory.id },
                            data: { usable: inventory.usable - data.netWeight }
                        });
                        await tx.stockLedger.create({
                            data: {
                                plantId: transaction.plantId,
                                transaction: 'OUT',
                                itemType: dispatch.item,
                                quantity: data.netWeight,
                                reference: dispatch.dispatchNo,
                                remarks: `Dispatched via Gate Pass ${transaction.gatePass?.vehicleNo}`
                            }
                        });
                    }
                    await tx.financeTransaction.create({
                        data: {
                            plantId: transaction.plantId,
                            transactionType: 'SALE',
                            totalAmount: 0,
                            partyName: dispatch.partyName,
                            invoiceNo: dispatch.dispatchNo,
                            paymentStatus: 'UNPAID'
                        }
                    });
                }
                return updatedTx;
            });
        }
        catch (error) {
            console.error('Error recording weight:', error);
            throw new common_1.InternalServerErrorException(error.message || 'Failed to record weight');
        }
    }
    async getVehicleAllocationStats(plantId) {
        const whereClause = plantId === 'all' ? {} : { plantId };
        const allocated = await this.prisma.dispatch.count({
            where: { ...whereClause, status: { in: ['Pending', 'In Transit'] } }
        });
        const gatePasses = await this.prisma.gatePass.count({
            where: { ...whereClause, passType: 'OUTWARD', status: 'ACTIVE' }
        });
        return {
            allocatedVehicles: allocated,
            availableVehicles: 15,
            gatePassGenerated: gatePasses,
            pendingGatePass: await this.prisma.dispatch.count({
                where: { ...whereClause, gatePassId: null }
            })
        };
    }
    async getInventoryDeductions(plantId) {
        const whereClause = plantId === 'all' ? {} : { plantId };
        return this.prisma.stockLedger.findMany({
            where: { ...whereClause, transaction: 'OUT' },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }
    async getFinanceOverview(plantId) {
        const whereClause = plantId === 'all' ? {} : { plantId };
        const ledgers = await this.prisma.financeTransaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaysSales = ledgers
            .filter(l => l.transactionType === 'SALE' && l.date >= today)
            .reduce((acc, curr) => acc + curr.totalAmount, 0);
        const todaysCollection = ledgers
            .filter(l => l.transactionType === 'RECEIPT' && l.date >= today)
            .reduce((acc, curr) => acc + curr.paidAmount, 0);
        const totalSales = ledgers
            .filter(l => l.transactionType === 'SALE')
            .reduce((acc, curr) => acc + curr.totalAmount, 0);
        const totalCollection = ledgers
            .filter(l => l.transactionType === 'RECEIPT')
            .reduce((acc, curr) => acc + curr.paidAmount, 0);
        const pendingInvoices = ledgers.filter(l => l.transactionType === 'SALE' && l.paymentStatus === 'UNPAID').length;
        return {
            todaysSales,
            todaysCollection,
            outstandingAmount: totalSales - totalCollection,
            pendingInvoices,
            recentTransactions: ledgers.slice(0, 5)
        };
    }
    async getSystemUtilities(plantId) {
        const whereClause = plantId === 'all' ? {} : { plantId };
        let utility = await this.prisma.systemUtility.findFirst({
            where: whereClause
        });
        if (!utility && plantId !== 'all') {
            utility = await this.prisma.systemUtility.create({
                data: { plantId }
            });
        }
        const uptimeInSeconds = os.uptime();
        const days = Math.floor(uptimeInSeconds / (3600 * 24));
        const hours = Math.floor((uptimeInSeconds % (3600 * 24)) / 3600);
        const systemUptime = `${days} Days ${hours} Hrs`;
        const sizeResult = await this.prisma.$queryRaw `SELECT pg_database_size(current_database()) as size`;
        const bytes = sizeResult[0]?.size ? Number(sizeResult[0].size) : 0;
        let dbSizeFormatted = '0 MB';
        if (bytes > 1024 * 1024 * 1024) {
            dbSizeFormatted = (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
        else {
            dbSizeFormatted = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        }
        return {
            powerStatus: utility?.powerStatus || 'Normal',
            lastBackup: utility?.lastBackup || new Date(),
            databaseSize: dbSizeFormatted,
            systemUptime
        };
    }
};
exports.DispatchFinanceService = DispatchFinanceService;
exports.DispatchFinanceService = DispatchFinanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DispatchFinanceService);
//# sourceMappingURL=dispatch-finance.service.js.map
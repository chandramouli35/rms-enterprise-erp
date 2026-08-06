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
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FinanceService = class FinanceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTransaction(createFinanceDto) {
        try {
            const transaction = await this.prisma.financeTransaction.create({
                data: {
                    plantId: createFinanceDto.plantId,
                    transactionType: createFinanceDto.transactionType,
                    totalAmount: createFinanceDto.totalAmount,
                    paidAmount: createFinanceDto.paidAmount || 0,
                    balance: createFinanceDto.totalAmount - (createFinanceDto.paidAmount || 0),
                    partyName: createFinanceDto.partyName,
                    invoiceNo: createFinanceDto.invoiceNo,
                    particulars: createFinanceDto.particulars,
                    category: createFinanceDto.category,
                    paymentStatus: createFinanceDto.paymentStatus || ((createFinanceDto.paidAmount || 0) >= createFinanceDto.totalAmount ? 'PAID' :
                        (createFinanceDto.paidAmount || 0) > 0 ? 'PARTIAL' : 'UNPAID'),
                    date: createFinanceDto.date ? new Date(createFinanceDto.date) : new Date(),
                }
            });
            return transaction;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message || 'Failed to create transaction');
        }
    }
    async getLedger(plantId, type) {
        const whereClause = plantId === 'all' ? { transactionType: type } : { plantId, transactionType: type };
        return this.prisma.financeTransaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' }
        });
    }
    async getExpenseSummary(plantId) {
        const whereClause = plantId === 'all' ? { transactionType: 'EXPENSE' } : { plantId, transactionType: 'EXPENSE' };
        const expenses = await this.prisma.financeTransaction.findMany({
            where: whereClause
        });
        const categoryMap = {};
        expenses.forEach(exp => {
            const cat = exp.category || 'Other Expenses';
            categoryMap[cat] = (categoryMap[cat] || 0) + exp.totalAmount;
        });
        const colors = ['#3b82f6', '#a855f7', '#f43f5e', '#eab308', '#22c55e', '#ec4899', '#14b8a6'];
        return Object.entries(categoryMap).map(([name, value], idx) => ({
            name,
            value,
            color: colors[idx % colors.length]
        })).sort((a, b) => b.value - a.value);
    }
    async getCashbook(plantId) {
        const whereClause = plantId === 'all' ? {} : { plantId };
        const transactions = await this.prisma.financeTransaction.findMany({
            where: whereClause
        });
        let totalReceipt = 0;
        let totalPayment = 0;
        const dailyData = {};
        transactions.forEach(tx => {
            if (['SALE', 'RECEIPT'].includes(tx.transactionType)) {
                totalReceipt += tx.paidAmount || 0;
            }
            else if (['PURCHASE', 'EXPENSE', 'PAYMENT'].includes(tx.transactionType)) {
                totalPayment += tx.paidAmount || 0;
            }
            const dateKey = new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            if (!dailyData[dateKey])
                dailyData[dateKey] = { collection: 0, expense: 0 };
            if (['SALE', 'RECEIPT'].includes(tx.transactionType)) {
                dailyData[dateKey].collection += (tx.paidAmount || 0) / 100000;
            }
            else if (['PURCHASE', 'EXPENSE', 'PAYMENT'].includes(tx.transactionType)) {
                dailyData[dateKey].expense += (tx.paidAmount || 0) / 100000;
            }
        });
        const openingBalance = 225000;
        const closingBalance = openingBalance + totalReceipt - totalPayment;
        const barChartData = Object.entries(dailyData)
            .slice(0, 7)
            .map(([name, { collection, expense }]) => ({
            name,
            collection: Number(collection.toFixed(1)),
            expense: Number(expense.toFixed(1))
        }));
        return {
            overview: {
                openingBalance,
                totalReceipt,
                totalPayment,
                closingBalance
            },
            barChartData
        };
    }
    async getOutstanding(plantId) {
        const whereClause = plantId === 'all' ? { balance: { gt: 0 } } : { plantId, balance: { gt: 0 } };
        const transactions = await this.prisma.financeTransaction.findMany({
            where: whereClause
        });
        const partyMap = {};
        transactions.forEach(tx => {
            const party = tx.partyName || 'Unknown Party';
            partyMap[party] = (partyMap[party] || 0) + tx.balance;
        });
        return Object.entries(partyMap).map(([name, amount]) => ({
            name,
            amount
        })).sort((a, b) => b.amount - a.amount).slice(0, 10);
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map
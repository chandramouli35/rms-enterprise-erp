import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinanceDto } from './dto/create-finance.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(createFinanceDto: CreateFinanceDto) {
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
          paymentStatus: createFinanceDto.paymentStatus || (
            (createFinanceDto.paidAmount || 0) >= createFinanceDto.totalAmount ? 'PAID' : 
            (createFinanceDto.paidAmount || 0) > 0 ? 'PARTIAL' : 'UNPAID'
          ),
          date: createFinanceDto.date ? new Date(createFinanceDto.date) : new Date(),
        }
      });
      return transaction;
    } catch (error: any) {
      throw new InternalServerErrorException(error.message || 'Failed to create transaction');
    }
  }

  async getLedger(plantId: string, type: string) {
    const whereClause = plantId === 'all' ? { transactionType: type } : { plantId, transactionType: type };
    return this.prisma.financeTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
  }

  async getExpenseSummary(plantId: string) {
    const whereClause = plantId === 'all' ? { transactionType: 'EXPENSE' } : { plantId, transactionType: 'EXPENSE' };
    const expenses = await this.prisma.financeTransaction.findMany({
      where: whereClause
    });

    const categoryMap: Record<string, number> = {};
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

  async getCashbook(plantId: string) {
    const whereClause = plantId === 'all' ? {} : { plantId };
    const transactions = await this.prisma.financeTransaction.findMany({
      where: whereClause
    });

    let totalReceipt = 0;
    let totalPayment = 0;

    const dailyData: Record<string, { collection: number, expense: number }> = {};

    transactions.forEach(tx => {
      // Very naive mapping for dummy calculations
      if (['SALE', 'RECEIPT'].includes(tx.transactionType)) {
        totalReceipt += tx.paidAmount || 0;
      } else if (['PURCHASE', 'EXPENSE', 'PAYMENT'].includes(tx.transactionType)) {
        totalPayment += tx.paidAmount || 0;
      }

      const dateKey = new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (!dailyData[dateKey]) dailyData[dateKey] = { collection: 0, expense: 0 };

      if (['SALE', 'RECEIPT'].includes(tx.transactionType)) {
        dailyData[dateKey].collection += (tx.paidAmount || 0) / 100000; // In Lakhs
      } else if (['PURCHASE', 'EXPENSE', 'PAYMENT'].includes(tx.transactionType)) {
        dailyData[dateKey].expense += (tx.paidAmount || 0) / 100000;
      }
    });

    // Opening balance logic can be added later
    const openingBalance = 225000; 
    const closingBalance = openingBalance + totalReceipt - totalPayment;

    const barChartData = Object.entries(dailyData)
      .slice(0, 7) // Last 7 days
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

  async getOutstanding(plantId: string) {
    const whereClause = plantId === 'all' ? { balance: { gt: 0 } } : { plantId, balance: { gt: 0 } };
    
    const transactions = await this.prisma.financeTransaction.findMany({
      where: whereClause
    });

    const partyMap: Record<string, number> = {};
    transactions.forEach(tx => {
      const party = tx.partyName || 'Unknown Party';
      partyMap[party] = (partyMap[party] || 0) + tx.balance;
    });

    return Object.entries(partyMap).map(([name, amount]) => ({
      name,
      amount
    })).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }
}

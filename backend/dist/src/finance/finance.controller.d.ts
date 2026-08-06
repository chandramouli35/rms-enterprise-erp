import { FinanceService } from './finance.service';
import { CreateFinanceDto } from './dto/create-finance.dto';
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    createTransaction(createFinanceDto: CreateFinanceDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        plantId: string;
        category: string | null;
        partyName: string | null;
        transactionType: string;
        invoiceNo: string | null;
        particulars: string | null;
        totalAmount: number;
        paidAmount: number;
        balance: number;
        paymentStatus: string;
    }>;
    getLedger(plantId: string, type: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        date: Date;
        plantId: string;
        category: string | null;
        partyName: string | null;
        transactionType: string;
        invoiceNo: string | null;
        particulars: string | null;
        totalAmount: number;
        paidAmount: number;
        balance: number;
        paymentStatus: string;
    }[]>;
    getExpenseSummary(plantId: string): Promise<{
        name: string;
        value: number;
        color: string;
    }[]>;
    getCashbook(plantId: string): Promise<{
        overview: {
            openingBalance: number;
            totalReceipt: number;
            totalPayment: number;
            closingBalance: number;
        };
        barChartData: {
            name: string;
            collection: number;
            expense: number;
        }[];
    }>;
    getOutstanding(plantId: string): Promise<{
        name: string;
        amount: number;
    }[]>;
}

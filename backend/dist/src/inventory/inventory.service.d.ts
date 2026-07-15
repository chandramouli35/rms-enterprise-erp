import { PrismaService } from '../prisma/prisma.service';
import { GetInventoryFilterDto, GetStockReportDto } from './dto/inventory.dto';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    adjustStock(params: {
        plantId: string;
        itemType: string;
        variety?: string;
        godown?: string;
        quantityChange: number;
        transactionType: string;
        referenceId?: string;
        remarks?: string;
        shift?: string;
        usableChange?: number;
        category?: string;
        unit?: string;
        stockValueChange?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variety: string | null;
        plantId: string;
        itemType: string;
        quantity: number;
        usable: number;
        reserved: number;
        damaged: number;
        stockValue: number;
        category: string | null;
        godown: string | null;
        unit: string;
    }>;
    getDashboardSummary(plantId: string, itemType?: string): Promise<{
        globalMetrics: {
            PADDY: {
                total: number;
                value: number;
            };
            RICE: {
                total: number;
                value: number;
            };
            BRAN: {
                total: number;
                value: number;
            };
            HUSK: {
                total: number;
                value: number;
            };
            FINISHED_GOODS: {
                total: number;
                value: number;
            };
            CONSUMABLES: {
                total: number;
                value: number;
            };
        };
        tabMetrics: {
            label: string;
            value: string;
            unit: string;
            type: string;
            color: string;
        }[];
        stockComposition: {
            name: string;
            value: any;
        }[];
        godownStockData: unknown[];
    }>;
    getInventoryList(plantId: string, filterDto: GetInventoryFilterDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variety: string | null;
        plantId: string;
        itemType: string;
        quantity: number;
        usable: number;
        reserved: number;
        damaged: number;
        stockValue: number;
        category: string | null;
        godown: string | null;
        unit: string;
    }[]>;
    getStockReport(plantId: string, filterDto: GetStockReportDto): Promise<any[]>;
    getLedger(plantId: string, filterDto: any): Promise<{
        id: string;
        createdAt: Date;
        shift: string | null;
        remarks: string | null;
        plantId: string;
        transaction: string;
        itemType: string;
        quantity: number;
        reference: string | null;
    }[]>;
}

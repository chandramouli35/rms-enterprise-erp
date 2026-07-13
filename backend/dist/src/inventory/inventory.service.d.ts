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
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        usable: number;
        reserved: number;
        damaged: number;
        stockValue: number;
        variety: string | null;
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
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        usable: number;
        reserved: number;
        damaged: number;
        stockValue: number;
        variety: string | null;
        category: string | null;
        godown: string | null;
        unit: string;
    }[]>;
    getStockReport(plantId: string, filterDto: GetStockReportDto): Promise<any[]>;
    getLedger(plantId: string, filterDto: any): Promise<{
        plantId: string;
        id: string;
        createdAt: Date;
        transaction: string;
        itemType: string;
        quantity: number;
        shift: string | null;
        reference: string | null;
        remarks: string | null;
    }[]>;
}

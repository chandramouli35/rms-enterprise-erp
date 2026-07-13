import { InventoryService } from './inventory.service';
import { GetInventoryFilterDto, GetStockReportDto } from './dto/inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getDashboardSummary(req: any, itemType?: string): Promise<{
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
    getInventoryList(req: any, filterDto: GetInventoryFilterDto): Promise<{
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
    getStockReport(req: any, filterDto: GetStockReportDto): Promise<any[]>;
    adjustStock(req: any, body: any): Promise<{
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
    getLedger(req: any, filterDto: any): Promise<{
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

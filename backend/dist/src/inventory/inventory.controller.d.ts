import { InventoryService } from './inventory.service';
import { GetInventoryFilterDto, GetStockReportDto } from './dto/inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getByProductStock(req: any): Promise<Record<string, number>>;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variety: string | null;
        quantity: number;
        plantId: string;
        unit: string;
        category: string | null;
        itemType: string;
        godown: string | null;
        usable: number;
        reserved: number;
        damaged: number;
        stockValue: number;
    }[]>;
    getStockReport(req: any, filterDto: GetStockReportDto): Promise<any[]>;
    adjustStock(req: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        variety: string | null;
        quantity: number;
        plantId: string;
        unit: string;
        category: string | null;
        itemType: string;
        godown: string | null;
        usable: number;
        reserved: number;
        damaged: number;
        stockValue: number;
    }>;
    getLedger(req: any, filterDto: any): Promise<{
        id: string;
        createdAt: Date;
        quantity: number;
        remarks: string | null;
        plantId: string;
        shift: string | null;
        itemType: string;
        transaction: string;
        reference: string | null;
    }[]>;
}

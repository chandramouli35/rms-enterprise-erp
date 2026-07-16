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
    getStockReport(req: any, filterDto: GetStockReportDto): Promise<any[]>;
    adjustStock(req: any, body: any): Promise<{
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
    getLedger(req: any, filterDto: any): Promise<{
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

import { InventoryService } from './inventory.service';
import { ItemCategory } from '@prisma/client';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getInventoryMatrix(plantId: string, category?: ItemCategory): Promise<({
        stockLedgers: {
            id: string;
            createdAt: Date;
            quantity: number;
            transactionType: import(".prisma/client").$Enums.TransactionType;
            referenceId: string | null;
            remarks: string | null;
            inventoryItemId: string;
        }[];
    } & {
        plantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        itemType: string;
        quantity: number;
        itemCategory: import(".prisma/client").$Enums.ItemCategory;
    })[]>;
    getStockLedger(itemId: string): Promise<{
        id: string;
        createdAt: Date;
        quantity: number;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        referenceId: string | null;
        remarks: string | null;
        inventoryItemId: string;
    }[]>;
}

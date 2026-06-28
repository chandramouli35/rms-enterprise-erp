import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, ItemCategory } from '@prisma/client';
export interface ProcessTransactionDto {
    plantId: string;
    itemType: string;
    itemCategory: ItemCategory;
    quantity: number;
    transactionType: TransactionType;
    referenceId?: string;
    remarks?: string;
}
export declare class InventoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    processTransaction(dto: ProcessTransactionDto): Promise<{
        inventoryItem: {
            plantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            itemType: string;
            quantity: number;
            itemCategory: import(".prisma/client").$Enums.ItemCategory;
        };
        ledger: {
            id: string;
            createdAt: Date;
            quantity: number;
            transactionType: import(".prisma/client").$Enums.TransactionType;
            referenceId: string | null;
            remarks: string | null;
            inventoryItemId: string;
        };
    }>;
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
    getStockLedger(inventoryItemId: string): Promise<{
        id: string;
        createdAt: Date;
        quantity: number;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        referenceId: string | null;
        remarks: string | null;
        inventoryItemId: string;
    }[]>;
}
